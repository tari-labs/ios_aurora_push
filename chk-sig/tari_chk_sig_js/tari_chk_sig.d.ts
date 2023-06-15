/* tslint:disable */
/* eslint-disable */
/**
* The version of this library
* @returns {string}
*/
export function version(): string;
/**
* Checks the validity of a Domain speicifc Schnorr signature. Returns a [JsValue] of a serialized
* [SignatureVerifyResult]
* @param {string} pub_nonce
* @param {string} signature
* @param {string} pub_key
* @param {string} msg
* @returns {any}
*/
export function check_signature(pub_nonce: string, signature: string, pub_key: string, msg: string): any;
