//  Copyright 2023. The Tari Project
//
//  Redistribution and use in source and binary forms, with or without modification, are permitted provided that the
//  following conditions are met:
//
//  1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following
//  disclaimer.
//
//  2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the
//  following disclaimer in the documentation and/or other materials provided with the distribution.
//
//  3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote
//  products derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES,
//  INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
//  DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
//  SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
//  SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
//  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE
//  USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

//! WASM bindings and functions

use serde::{Deserialize, Serialize};
use tari_crypto::{
    hash_domain,
    ristretto::{RistrettoPublicKey, RistrettoSchnorrWithDomain, RistrettoSecretKey},
    tari_utilities::hex::Hex,
};
use wasm_bindgen::prelude::*;

const VERSION: &str = env!("CARGO_PKG_VERSION");

// This line needs to match with the Domain separator in the Tari Wallet
// https://github.com/tari-project/tari/blob/development/base_layer/wallet/src/wallet.rs#L106-L110
hash_domain!(
    WalletMessageSigningDomain,
    "com.tari.tari_project.base_layer.wallet.message_signing"
);

/// The version of this library
#[wasm_bindgen]
pub fn version() -> String {
    VERSION.into()
}

/// Result of calling [check_signature] and [check_comsig_signature] and [check_comandpubsig_signature]
#[derive(Debug, Serialize, Deserialize, Default)]
pub struct SignatureVerifyResult {
    /// True if the signature was valid
    pub result: bool,
    /// Will contain the error if one occurred, otherwise empty
    pub error: String,
}

/// Checks the validity of a Domain speicifc Schnorr signature. Returns a [JsValue] of a serialized
/// [SignatureVerifyResult]
#[allow(non_snake_case)]
#[wasm_bindgen]
pub fn check_signature(pub_nonce: &str, signature: &str, pub_key: &str, msg: &str) -> JsValue {
    let mut result = SignatureVerifyResult::default();

    let R = match RistrettoPublicKey::from_hex(pub_nonce) {
        Ok(n) => n,
        Err(_) => {
            result.error = format!("{pub_nonce} is not a valid public nonce");
            return serde_wasm_bindgen::to_value(&result).unwrap();
        },
    };

    let P = match RistrettoPublicKey::from_hex(pub_key) {
        Ok(p) => p,
        Err(_) => {
            result.error = format!("{pub_key} is not a valid public key");
            return serde_wasm_bindgen::to_value(&result).unwrap();
        },
    };

    let s = match RistrettoSecretKey::from_hex(signature) {
        Ok(s) => s,
        Err(_) => {
            result.error = format!("{signature} is not a valid hex representation of a signature");
            return serde_wasm_bindgen::to_value(&result).unwrap();
        },
    };

    let sig: RistrettoSchnorrWithDomain<WalletMessageSigningDomain> = RistrettoSchnorrWithDomain::new(R, s);
    result.result = sig.verify_message(&P, msg.as_bytes());
    serde_wasm_bindgen::to_value(&result).unwrap()
}
