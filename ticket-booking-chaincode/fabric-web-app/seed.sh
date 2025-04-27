#!/bin/bash

echo "⚙️ Seeding MongoDB via backend APIs..."
BASE_URL="http://localhost:3000"

# Step 1: Login as admin and save cookies
echo "🔑 Logging in as admin..."
curl -s -X POST "$BASE_URL/api/login" \
  -c cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@blockchain.com", "password": "admin123"}' > /dev/null

if [ ! -f cookies.txt ]; then
  echo "❌ Failed to create cookie file. Login might have failed."
  exit 1
fi

echo "✅ Admin session cookie saved!"

# Step 2: Helper to send authorized POST using cookies
post() {
  echo "➡️ $1"
  curl -s -X POST "$BASE_URL$2" \
    -b cookies.txt \
    -H "Content-Type: application/json" \
    -d "$3"
  echo -e "\n✅ Done: $1"
}

# ========== 1. Register Providers ==========
post "Registering Provider 1" "/api/registerProvider" '{
  "id": "prov_iitk",
  "name": "IITK Travels",
  "ownerName": "Admin1",
  "email": "iitk@example.com",
  "phone": "9999999999",
  "rating": 5,
  "isPublic": true,
  "password": "iitk123"
}'

post "Registering Provider 2" "/api/registerProvider" '{
  "id": "prov_kgp",
  "name": "KGP Travels",
  "ownerName": "Admin2",
  "email": "kgp@example.com",
  "phone": "8888888888",
  "rating": 4,
  "isPublic": false,
  "password": "kgp123"
}'

# ========== 2. Add Transports (3 per provider) ==========
for prov in prov_iitk prov_kgp; do
  for mode in bus train plane; do
    trans_id="trans_${prov}_${mode}"
    post "Adding Transport: $trans_id" "/api/addTransport" "{
      \"id\": \"$trans_id\",
      \"providerId\": \"$prov\",
      \"type\": \"$mode\"
    }"
  done
done

# ========== 3. Add Schedules (2 per transport) ==========
for prov in prov_iitk prov_kgp; do
  for mode in bus train plane; do
    trans_id="trans_${prov}_${mode}"
    for i in 1 2; do
      sch_id="sch_${trans_id}_$i"
      departure=$(date -u -d "+$((i*2)) days" +"%Y-%m-%dT%H:%M:%SZ")

      post "Creating Schedule: $sch_id" "/api/createSchedule" "{
        \"id\": \"$sch_id\",
        \"transportId\": \"$trans_id\",
        \"departure\": \"$departure\",
        \"source\": \"kanpur\",
        \"destination\": \"lucknow\",
        \"totalSeats\": 40,
        \"basePrice\": $((200 + i * 50))
      }"
    done
  done
done

echo -e "\n🎉 Seeding completed successfully!"
