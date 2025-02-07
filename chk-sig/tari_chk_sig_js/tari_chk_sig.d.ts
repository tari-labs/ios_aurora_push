/* tslint:disable */
/* eslint-disable */
/**
 * The version of this library
 */
export function version(): string;
/**
 * Checks the validity of a Domain speicifc Schnorr signature. Returns a [JsValue] of a serialized
 * [SignatureVerifyResult]
 */
export function check_signature(pub_nonce: string, signature: string, pub_key: string, msg: string): any;
/**
 * Creates a signature using Schnorr. Returns a [JsValue] of a serialized
 * [SignatureCreation]
 */
export function sign(msg: string, pub_key: string, priv_key: string): any;
/**
 * Creates a signature using Schnorr. Returns a [JsValue] of a serialized
 * [SignatureCreation]
 */
export function create_keypair(): any;
