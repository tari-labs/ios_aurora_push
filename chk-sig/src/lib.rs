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

use rand::rngs::OsRng;
use serde::{Deserialize, Serialize};
use tari_crypto::{
    hash_domain,
    ristretto::{RistrettoPublicKey, RistrettoSchnorrWithDomain, RistrettoSecretKey},
    tari_utilities::hex::Hex,
    keys::SecretKey
};
use wasm_bindgen::prelude::*;

const VERSION: &str = env!("CARGO_PKG_VERSION");

// This line needs to match with the Domain separator in the Tari Wallet
// https://github.com/tari-project/tari/blob/development/base_layer/wallet/src/wallet.rs#L106-L110
hash_domain!(WalletMessageSigningDomain, "com.tari.base_layer.wallet.message_signing");

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
    result.result = sig.verify(&P, msg.as_bytes());
    serde_wasm_bindgen::to_value(&result).unwrap()
}

fn create_random_keypair() -> (RistrettoSecretKey, RistrettoPublicKey) {
    // RistrettoPublicKey::random_keypair(&mut OsRng)
    use tari_utilities::{hex::Hex, ByteArray};

    let mut rng = rand::thread_rng();
    let _p1 = RistrettoPublicKey::from_canonical_bytes(&[
        224, 196, 24, 247, 200, 217, 196, 205, 215, 57, 91, 147, 234, 18, 79, 58, 217, 144, 33, 187, 104, 29, 252, 51,
        2, 169, 217, 154, 46, 83, 230, 78,
    ]);
    let _p2 = RistrettoPublicKey::from_hex(&"e882b131016b52c1d3337080187cf768423efccbb517bb495ab812c4160ff44e");
    let sk = RistrettoSecretKey::random(&mut rng);
    let _p3 = RistrettoPublicKey::from_vec(&sk.to_vec()).unwrap();
    (sk, _p3)
}

fn create_signature(
    msg: &str,
    pub_key: Option<&str>,
    priv_key: Option<&str>,
) -> (
    RistrettoSchnorrWithDomain<WalletMessageSigningDomain>,
    RistrettoPublicKey,
    RistrettoSecretKey,
) {
    let (dsk, dpk) = create_random_keypair();
    let sk = if let Some(priv_key) = priv_key {
        RistrettoSecretKey::from_hex(priv_key).unwrap()
    } else {
        dsk
    };

    let pk = if let Some(pub_key) = pub_key {
        RistrettoPublicKey::from_hex(pub_key).unwrap()
    } else {
        dpk
    };
    let sig = RistrettoSchnorrWithDomain::sign(&sk, msg.as_bytes(), &mut OsRng).unwrap();
    (sig, pk, sk)
}

/// Creates a signature using Schnorr. Returns a [JsValue] of a serialized
/// [SignatureCreation]
#[allow(non_snake_case)]
#[wasm_bindgen]
pub fn sign(msg: &str, pub_key: &str, priv_key: &str) -> JsValue {
    let result = create_signature(msg, Some(pub_key), Some(priv_key));
    serde_wasm_bindgen::to_value(&result).unwrap()
}

/// Creates a signature using Schnorr. Returns a [JsValue] of a serialized
/// [SignatureCreation]
#[wasm_bindgen]
pub fn create_keypair() -> JsValue {
    let (sk, pk) = create_random_keypair();
    serde_wasm_bindgen::to_value(&(sk.to_hex(), pk.to_hex())).unwrap()
}

#[cfg(test)]
mod test {
    use tari_crypto::{keys::PublicKey, signatures::SchnorrSignature};
    use wasm_bindgen_test::*;

    use super::*;

    hash_domain!(TestDomain, "com.tari.test");

    const SAMPLE_CHALLENGE: &str =
        "Cormac was completely aware that he was being manipulated, but how he could not see.";

    fn check_signature(pub_nonce: &str, signature: &str, pub_key: &str, msg: &str) -> SignatureVerifyResult {
        serde_wasm_bindgen::from_value(super::check_signature(pub_nonce, signature, pub_key, msg)).unwrap()
    }

    #[wasm_bindgen_test]
    fn it_errors_given_invalid_data() {
        fn it_errors(pub_nonce: &str, signature: &str, pub_key: &str, msg: &str) {
            let result = check_signature(pub_nonce, signature, pub_key, msg);
            assert!(
                !result.error.is_empty(),
                "check_signature did not fail with args ({}, {}, {}, {})",
                pub_nonce,
                signature,
                pub_key,
                msg
            );
            assert!(!result.result);
        }

        it_errors("", "", "", SAMPLE_CHALLENGE);

        let (sig, pk, _) = create_signature(SAMPLE_CHALLENGE, None, None);
        it_errors(&sig.get_public_nonce().to_hex(), "", &pk.to_hex(), SAMPLE_CHALLENGE);
    }

    #[wasm_bindgen_test]
    fn it_fails_if_verification_is_invalid() {
        fn it_fails(pub_nonce: &str, signature: &str, pub_key: &str, msg: &str) {
            let result = check_signature(pub_nonce, signature, pub_key, msg);
            assert!(result.error.is_empty());
            assert!(!result.result);
        }

        let (sig, pk, _) = create_signature(SAMPLE_CHALLENGE, None, None);

        it_fails(
            &RistrettoPublicKey::default().to_hex(),
            &sig.get_signature().to_hex(),
            &pk.to_hex(),
            SAMPLE_CHALLENGE,
        );
        it_fails(
            &sig.get_public_nonce().to_hex(),
            &sig.get_signature().to_hex(),
            &pk.to_hex(),
            "wrong challenge",
        );
        it_fails(
            &sig.get_public_nonce().to_hex(),
            &sig.get_signature().to_hex(),
            &RistrettoPublicKey::default().to_hex(),
            SAMPLE_CHALLENGE,
        );
    }

    #[wasm_bindgen_test]
    fn it_fails_if_domain_is_invalid() {
        fn it_fails(pub_nonce: &str, signature: &str, pub_key: &str, msg: &str) {
            let result = check_signature(pub_nonce, signature, pub_key, msg);
            assert!(result.error.is_empty());
            assert!(!result.result);
        }

        let (sk, pk) = create_random_keypair();
        let sig: SchnorrSignature<RistrettoPublicKey, RistrettoSecretKey, TestDomain> =
            RistrettoSchnorrWithDomain::sign(&sk, SAMPLE_CHALLENGE.as_bytes(), &mut OsRng).unwrap();

        it_fails(
            &sig.get_public_nonce().to_hex(),
            &sig.get_signature().to_hex(),
            &pk.to_hex(),
            SAMPLE_CHALLENGE,
        );
    }

    #[wasm_bindgen_test]
    fn it_succeeds_given_valid_data() {
        let (sig, pk, _) = create_signature(SAMPLE_CHALLENGE, None, None);
        let result = check_signature(
            &sig.get_public_nonce().to_hex(),
            &sig.get_signature().to_hex(),
            &pk.to_hex(),
            SAMPLE_CHALLENGE,
        );
        assert!(result.error.is_empty());
        assert!(result.result);
    }
}
