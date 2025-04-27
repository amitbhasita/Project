package main

import (
	"encoding/json"
	"fmt"
	"time"
	"crypto/sha256"        
	"strconv" 
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// ========== DATA STRUCTURES ========== //



type UserWallet struct {
	ID            string `json:"id"` // userId
	WalletBalance int    `json:"walletBalance"`
}


type Booking struct {
	ID         string `json:"id"`
	UserID     string `json:"userId"`
	ScheduleID string `json:"scheduleId"`
	SeatNumber string `json:"seatNumber"`
	PricePaid  int    `json:"pricePaid"`
	Status     string `json:"status"`     // ✅ Add this field
	Timestamp  string `json:"timestamp"`
	TxID       string `json:"txID"`       // Already present
}


// ========== SMART CONTRACT ========== //
type SmartContract struct {
	contractapi.Contract
}



//refactored
func (s *SmartContract) GetBooking(ctx contractapi.TransactionContextInterface, id string) (*Booking, error) {
	bookingJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return nil, fmt.Errorf("failed to read booking: %v", err)
	}
	if bookingJSON == nil {
		return nil, fmt.Errorf("booking %s does not exist", id)
	}

	var booking Booking
	if err := json.Unmarshal(bookingJSON, &booking); err != nil {
		return nil, fmt.Errorf("failed to unmarshal booking: %v", err)
	}
	return &booking, nil
}


//refactored
func (s *SmartContract) GetBookingsByUser(ctx contractapi.TransactionContextInterface, userId string) ([]Booking, error) {
	var bookings []Booking

	iterator, err := ctx.GetStub().GetStateByRange("book_", "book_zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz")
	if err != nil {
		return nil, fmt.Errorf("failed to get state: %v", err)
	}
	defer iterator.Close()

	for iterator.HasNext() {
		resp, err := iterator.Next()
		if err != nil {
			continue
		}

		var booking Booking
		if err := json.Unmarshal(resp.Value, &booking); err == nil {
			if booking.UserID == userId {
				bookings = append(bookings, booking)
			}
		}
	}

	if bookings == nil {
		bookings = []Booking{}
	}
	fmt.Printf("Found %d bookings for user %s\n", len(bookings), userId)
	return bookings, nil
}


func (s *SmartContract) GetBookingByUserAndSchedule(ctx contractapi.TransactionContextInterface, userId string, scheduleId string) (*Booking, error) {
	iterator, err := ctx.GetStub().GetStateByRange("book_", "book_zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz")
	if err != nil {
		return nil, fmt.Errorf("failed to get state: %v", err)
	}
	defer iterator.Close()

	for iterator.HasNext() {
		resp, err := iterator.Next()
		if err != nil {
			continue
		}

		var booking Booking
		if err := json.Unmarshal(resp.Value, &booking); err == nil {
			if booking.UserID == userId && booking.ScheduleID == scheduleId {
				return &booking, nil
			}
		}
	}

	return nil, fmt.Errorf("booking not found for user %s and schedule %s", userId, scheduleId)
}

//refactored
func (s *SmartContract) BookMultipleTickets(
	ctx contractapi.TransactionContextInterface,
	userId string,
	scheduleId string,
	seatNumbersJSON string,
	bookingIdsJSON string,
	priceStr string,
) error {
	var seatNumbers []string
	var bookingIds []string

	if err := json.Unmarshal([]byte(seatNumbersJSON), &seatNumbers); err != nil {
		return fmt.Errorf("invalid seatNumbers input: %v", err)
	}
	if err := json.Unmarshal([]byte(bookingIdsJSON), &bookingIds); err != nil {
		return fmt.Errorf("invalid bookingIds input: %v", err)
	}
	if len(seatNumbers) != len(bookingIds) || len(seatNumbers) == 0 {
		return fmt.Errorf("number of seatNumbers and bookingIds must be equal and non-zero")
	}

	// 💰 Parse price
	price, err := strconv.Atoi(priceStr)
	if err != nil || price < 0 {
		return fmt.Errorf("invalid price value: %v", err)
	}

	// 🔍 Get user wallet
	walletBytes, err := ctx.GetStub().GetState(userId)
	if err != nil {
		return fmt.Errorf("failed to read user wallet: %v", err)
	}
	if walletBytes == nil {
		return fmt.Errorf("user wallet not found: %s", userId)
	}

	var wallet UserWallet
	if err := json.Unmarshal(walletBytes, &wallet); err != nil {
		return fmt.Errorf("failed to unmarshal user wallet: %v", err)
	}

	// 💸 Check balance
	totalCost := price * len(seatNumbers)
	if wallet.WalletBalance < totalCost {
		return fmt.Errorf("insufficient balance: required %d, available %d", totalCost, wallet.WalletBalance)
	}

	wallet.WalletBalance -= totalCost
	txID := ctx.GetStub().GetTxID()
	txTime, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	timestamp := time.Unix(txTime.Seconds, int64(txTime.Nanos)).UTC().Format(time.RFC3339)

	// 🧾 Create and store bookings
	for i, seat := range seatNumbers {
		booking := Booking{
			ID:         bookingIds[i],
			UserID:     userId,
			ScheduleID: scheduleId,
			SeatNumber: seat,
			PricePaid:  price,
			Status:     "pending",
			Timestamp:  timestamp,
			TxID:       txID,
		}
		bookingJSON, err := json.Marshal(booking)
		if err != nil {
			return fmt.Errorf("failed to marshal booking %s: %v", booking.ID, err)
		}
		if err := ctx.GetStub().PutState(booking.ID, bookingJSON); err != nil {
			return fmt.Errorf("failed to save booking %s: %v", booking.ID, err)
		}
	}

	// 💾 Update wallet
	updatedWalletBytes, err := json.Marshal(wallet)
	if err != nil {
		return fmt.Errorf("failed to marshal updated wallet: %v", err)
	}
	if err := ctx.GetStub().PutState(wallet.ID, updatedWalletBytes); err != nil {
		return fmt.Errorf("failed to update wallet: %v", err)
	}

	return nil
}



//refactored
func (s *SmartContract) VerifyTicket(ctx contractapi.TransactionContextInterface, bookingId string) (map[string]interface{}, error) {
	// 1. Get booking
	bookingJSON, err := ctx.GetStub().GetState(bookingId)
	if err != nil || bookingJSON == nil {
		return nil, fmt.Errorf("booking %s not found", bookingId)
	}

	var booking Booking
	if err := json.Unmarshal(bookingJSON, &booking); err != nil {
		return nil, fmt.Errorf("failed to unmarshal booking: %v", err)
	}

	// 2. Build partial response with booking only
	response := map[string]interface{}{
		"booking": map[string]interface{}{
			"id":         booking.ID,
			"userId":     booking.UserID,
			"scheduleId": booking.ScheduleID,
			"seatNumber": booking.SeatNumber,
			"pricePaid":  booking.PricePaid,
			"status":     booking.Status,
			"timestamp":  booking.Timestamp,
			"txID":       booking.TxID,
		},
		"user":      nil,       // Off-chain
		"schedule":  nil,       // Off-chain
		"transport": nil,       // Off-chain
	}

	return response, nil
}


//refactored
func (s *SmartContract) RefundBookingsByUserAndSchedule(
	ctx contractapi.TransactionContextInterface,
	userId string,
	scheduleId string,
) error {
	iterator, err := ctx.GetStub().GetStateByRange("book_", "book_zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz")
	if err != nil {
		return fmt.Errorf("failed to iterate bookings: %v", err)
	}
	defer iterator.Close()

	refundedCount := 0

	for iterator.HasNext() {
		resp, err := iterator.Next()
		if err != nil {
			continue
		}

		var booking Booking
		if err := json.Unmarshal(resp.Value, &booking); err != nil {
			continue
		}

		if booking.UserID == userId && booking.ScheduleID == scheduleId {
			booking.Status = "refunded"

			bookingJSON, err := json.Marshal(booking)
			if err != nil {
				return fmt.Errorf("failed to marshal booking: %v", err)
			}

			if err := ctx.GetStub().PutState(booking.ID, bookingJSON); err != nil {
				return fmt.Errorf("failed to update booking %s: %v", booking.ID, err)
			}

			refundedCount++
		}
	}

	fmt.Printf("✅ Refunded %d bookings for user %s on schedule %s\n", refundedCount, userId, scheduleId)
	return nil
}

func (s *SmartContract) GetUserWalletBalance(ctx contractapi.TransactionContextInterface, userId string) (int, error) {
	walletBytes, err := ctx.GetStub().GetState(userId)
	if err != nil {
		return 0, fmt.Errorf("failed to read user wallet: %v", err)
	}
	if walletBytes == nil {
		return 0, fmt.Errorf("wallet for user %s not found", userId)
	}

	var wallet UserWallet
	if err := json.Unmarshal(walletBytes, &wallet); err != nil {
		return 0, fmt.Errorf("failed to parse wallet data: %v", err)
	}

	return wallet.WalletBalance, nil
}


func (s *SmartContract) CreateUserWallet(ctx contractapi.TransactionContextInterface, userId string) error {
	existing, err := ctx.GetStub().GetState(userId)
	if err != nil {
		return fmt.Errorf("failed to check wallet: %v", err)
	}
	if existing != nil {
		return fmt.Errorf("wallet already exists for user %s", userId)
	}

	wallet := UserWallet{
		ID:            userId,
		WalletBalance: 1000,
	}
	data, err := json.Marshal(wallet)
	if err != nil {
		return fmt.Errorf("failed to marshal wallet: %v", err)
	}
	return ctx.GetStub().PutState(userId, data)
}

//refactored
func (s *SmartContract) AdjustUserWallet(ctx contractapi.TransactionContextInterface, userId string, amount int) error {
	// 🔍 Get wallet from ledger
	walletBytes, err := ctx.GetStub().GetState(userId)
	if err != nil {
		return fmt.Errorf("failed to read wallet: %v", err)
	}
	if walletBytes == nil {
		return fmt.Errorf("wallet for user %s does not exist", userId)
	}

	var wallet UserWallet
	if err := json.Unmarshal(walletBytes, &wallet); err != nil {
		return fmt.Errorf("failed to unmarshal wallet: %v", err)
	}

	// 💸 Apply adjustment
	newBalance := wallet.WalletBalance + amount
	if newBalance < 0 {
		return fmt.Errorf("insufficient wallet balance")
	}
	wallet.WalletBalance = newBalance

	// 🔐 Write back to ledger
	updatedWalletBytes, err := json.Marshal(wallet)
	if err != nil {
		return fmt.Errorf("failed to marshal updated wallet: %v", err)
	}

	fmt.Printf("✅ Wallet of %s adjusted by %d. New balance: %d\n", userId, amount, wallet.WalletBalance)
	return ctx.GetStub().PutState(userId, updatedWalletBytes)
}




//Refactored
func (s *SmartContract) ModifyTicket(
	ctx contractapi.TransactionContextInterface,
	oldBookingId string,
	newBookingId string,
	newScheduleId string,
	newSeatNumber string,
	newPriceStr string,
	penaltyStr string,
) error {
	// 🔍 Get existing booking
	oldBookingJSON, err := ctx.GetStub().GetState(oldBookingId)
	if err != nil || oldBookingJSON == nil {
		return fmt.Errorf("booking %s not found", oldBookingId)
	}
	var oldBooking Booking
	if err := json.Unmarshal(oldBookingJSON, &oldBooking); err != nil {
		return err
	}
	if oldBooking.Status != "confirmed" {
		return fmt.Errorf("cannot modify a %s booking", oldBooking.Status)
	}
	if oldBooking.ScheduleID == newScheduleId {
		return fmt.Errorf("cannot modify to the same schedule")
	}

	// 💰 Parse price and penalty
	newPrice, err := strconv.Atoi(newPriceStr)
	if err != nil {
		return fmt.Errorf("invalid new price: %v", err)
	}
	penalty, err := strconv.Atoi(penaltyStr)
	if err != nil {
		return fmt.Errorf("invalid penalty: %v", err)
	}

	// 🔍 Load user wallet
	walletBytes, err := ctx.GetStub().GetState(oldBooking.UserID)
	if err != nil || walletBytes == nil {
		return fmt.Errorf("wallet not found for user %s", oldBooking.UserID)
	}
	var wallet UserWallet
	if err := json.Unmarshal(walletBytes, &wallet); err != nil {
		return err
	}

	// 🧾 Apply refund from old booking (after penalty)
	refund := oldBooking.PricePaid - penalty
	if refund < 0 {
		refund = 0
	}
	wallet.WalletBalance += refund

	// 🧾 Check if wallet can cover new booking
	if wallet.WalletBalance < newPrice {
		return fmt.Errorf("insufficient balance after refund to book new schedule")
	}

	// 💳 Deduct new booking price
	wallet.WalletBalance -= newPrice

	// Cancel old booking
	oldBooking.Status = "cancelled"

	// Create new booking
	ts, _ := ctx.GetStub().GetTxTimestamp()
	newBooking := Booking{
		ID:         newBookingId,
		UserID:     oldBooking.UserID,
		ScheduleID: newScheduleId,
		SeatNumber: newSeatNumber,
		PricePaid:  newPrice,
		Status:     "confirmed",
		Timestamp:  time.Unix(ts.Seconds, int64(ts.Nanos)).UTC().Format(time.RFC3339),
		TxID:       ctx.GetStub().GetTxID(),
	}

	// 🔐 Save updated wallet and both bookings
	walletBytes, _ = json.Marshal(wallet)
	oldBookingBytes, _ := json.Marshal(oldBooking)
	newBookingBytes, _ := json.Marshal(newBooking)

	_ = ctx.GetStub().PutState(wallet.ID, walletBytes)
	_ = ctx.GetStub().PutState(oldBooking.ID, oldBookingBytes)
	_ = ctx.GetStub().PutState(newBooking.ID, newBookingBytes)

	fmt.Printf("✅ Ticket modified: %s → %s | Refund: %d | New Price: %d\n", oldBooking.ID, newBooking.ID, refund, newPrice)

	return nil
}





//refactored
func (s *SmartContract) CancelTicket(
	ctx contractapi.TransactionContextInterface,
	bookingId string,
	refundStr string,
) error {
	// 1. Get booking
	bookingJSON, err := ctx.GetStub().GetState(bookingId)
	if err != nil || bookingJSON == nil {
		return fmt.Errorf("booking %s not found", bookingId)
	}

	var booking Booking
	if err := json.Unmarshal(bookingJSON, &booking); err != nil {
		return fmt.Errorf("failed to unmarshal booking: %v", err)
	}

	if booking.Status != "confirmed" {
		return fmt.Errorf("cannot cancel a %s booking", booking.Status)
	}

	// 2. Parse refund amount (validated off-chain)
	refund, err := strconv.Atoi(refundStr)
	if err != nil || refund < 0 {
		return fmt.Errorf("invalid refund amount: %v", err)
	}

	// 3. Load user wallet
	walletBytes, err := ctx.GetStub().GetState(booking.UserID)
	if err != nil || walletBytes == nil {
		return fmt.Errorf("wallet not found for user %s", booking.UserID)
	}

	var wallet UserWallet
	if err := json.Unmarshal(walletBytes, &wallet); err != nil {
		return err
	}

	// 4. Apply refund and mark booking as cancelled
	wallet.WalletBalance += refund
	booking.Status = "cancelled"

	// 5. Save states
	walletBytes, _ = json.Marshal(wallet)
	bookingBytes, _ := json.Marshal(booking)

	if err := ctx.GetStub().PutState(wallet.ID, walletBytes); err != nil {
		return fmt.Errorf("failed to update wallet: %v", err)
	}
	if err := ctx.GetStub().PutState(booking.ID, bookingBytes); err != nil {
		return fmt.Errorf("failed to update booking: %v", err)
	}

	fmt.Printf("✅ Booking %s cancelled. Refund: ₹%d\n", booking.ID, refund)
	return nil
}


//refactored
func (s *SmartContract) ConfirmBooking(ctx contractapi.TransactionContextInterface, bookingId string) error {
	fmt.Printf("📦 [ConfirmBooking] Invoked for booking ID: %s\n", bookingId)

	bookingJSON, err := ctx.GetStub().GetState(bookingId)
	if err != nil {
		return fmt.Errorf("failed to read booking: %v", err)
	}
	if bookingJSON == nil {
		return fmt.Errorf("booking not found: %s", bookingId)
	}

	var b Booking
	if err := json.Unmarshal(bookingJSON, &b); err != nil {
		return fmt.Errorf("failed to parse booking JSON: %v", err)
	}

	if b.Status != "pending" {
		return fmt.Errorf("booking is already confirmed or has invalid status: %s", b.Status)
	}

	b.Status = "confirmed"

	updatedJSON, err := json.Marshal(b)
	if err != nil {
		return fmt.Errorf("failed to marshal updated booking: %v", err)
	}

	if err := ctx.GetStub().PutState(bookingId, updatedJSON); err != nil {
		return fmt.Errorf("failed to update booking state: %v", err)
	}

	fmt.Printf("✅ [ConfirmBooking] Booking %s confirmed successfully.\n", bookingId)
	return nil
}



// 		//refactored
func (s *SmartContract) GetAllPendingBookings(ctx contractapi.TransactionContextInterface) ([]Booking, error) {
	var pending []Booking

	iterator, err := ctx.GetStub().GetStateByRange("book_", "book_zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz")
	if err != nil {
		return nil, fmt.Errorf("failed to scan state: %v", err)
	}
	defer iterator.Close()

	for iterator.HasNext() {
		resp, err := iterator.Next()
		if err != nil {
			continue
		}

		var b Booking
		if err := json.Unmarshal(resp.Value, &b); err == nil {
			if b.Status == "pending" && b.TxID != "" {
				pending = append(pending, b)
			}
		}
	}

	// ✅ Always return at least an empty JSON array
	if pending == nil {
		pending = []Booking{}
	}

	return pending, nil
}


func (s *SmartContract) BookTicket(ctx contractapi.TransactionContextInterface, bookingId string, userId string, scheduleId string, seatNumber string, price int) error {

	// ✅ Retrieve UserWallet
	userWalletBytes, err := ctx.GetStub().GetState(userId)
	if err != nil {
		return fmt.Errorf("failed to read user wallet: %v", err)
	}
	if userWalletBytes == nil {
		return fmt.Errorf("user wallet %s not found", userId)
	}

	var wallet UserWallet
	if err := json.Unmarshal(userWalletBytes, &wallet); err != nil {
		return fmt.Errorf("failed to unmarshal wallet: %v", err)
	}

	// 💰 Check for sufficient balance
	if wallet.WalletBalance < price {
		return fmt.Errorf("insufficient balance: available %d, required %d", wallet.WalletBalance, price)
	}

	// 💳 Deduct balance
	wallet.WalletBalance -= price
	walletBytes, err := json.Marshal(wallet)
	if err != nil {
		return fmt.Errorf("failed to marshal updated wallet: %v", err)
	}
	if err := ctx.GetStub().PutState(wallet.ID, walletBytes); err != nil {
		return fmt.Errorf("failed to update wallet balance: %v", err)
	}

	// 🕒 Get timestamp
	txTime, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	timestamp := time.Unix(txTime.Seconds, int64(txTime.Nanos)).UTC().Format(time.RFC3339)

	// 🆔 Get transaction ID
	txID := ctx.GetStub().GetTxID()

	// 📄 Create Booking with status "pending"
	booking := Booking{
		ID:         bookingId,
		UserID:     userId,
		ScheduleID: scheduleId,
		SeatNumber: seatNumber,
		PricePaid:  price,
		Status:     "pending",
		Timestamp:  timestamp,
		TxID:       txID, // ✅ Fix: assign TxID here
	}

	bookingBytes, err := json.Marshal(booking)
	if err != nil {
		return fmt.Errorf("failed to marshal booking: %v", err)
	}
	if err := ctx.GetStub().PutState(bookingId, bookingBytes); err != nil {
		return fmt.Errorf("failed to save booking: %v", err)
	}
	fmt.Printf("📦 Booking struct to be saved: %+v\n", booking)


	return nil
}


func main() {
	chaincode, err := contractapi.NewChaincode(&SmartContract{})
	if err != nil {
		fmt.Printf("Error creating chaincode: %v", err)
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting chaincode: %v", err)
	}
}

func hashString(input string) string {
	hash := sha256.Sum256([]byte(input))
	return fmt.Sprintf("%x", hash)
}

