# Aurora Push Notifications server
Push notification server for Tari Aurora

#### Register device token for remote push notifications
```$xslt
POST http://localhost:4000/register/:pub_key
{
    "token": "device_token_goes_here",
    "platform": "ios", //"ios" or "android"
    "signature": "abc123", //Message to sign is "app_api_key" + "pub_key" + "token"
    "public_nonce": "def456" 
}
```

#### Send a push notification to transaction recipient
```$xslt
POST http://localhost:4000/send/:to_pub_key
{
    "from_pub_key": "abc123", //Your public key
    "signature": "abc123", //Message to sign is "app_api_key" + "from_pub_key" + "to_pub_key"
    "public_nonce": "def456" 
}
```

#### Cancel scheduled notifications
```$xslt
POST http://localhost:4000/cancel-reminders
{
    "pub_key": "abc123", //Your public key
    "signature": "abc123", //Message to sign is "app_api_key" + "pub_key" + "cancel-reminders"
    "public_nonce": "def456" 
}
```
