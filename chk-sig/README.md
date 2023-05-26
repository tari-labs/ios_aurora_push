# Tari chk-sig

This crate is part of the [Tari Cryptocurrency](https://tari.com) project.

Features of this library include:

- Validating Schnorr Signatures sent from the Tari wallet
- No really, that's it

# Compiling to WebAssembly

To build the WebAssembly module, the `wasm` feature must be enabled:

    $ wasm-pack build .

To generate a module for use in node.js, use this command:

    $ wasm-pack build --target nodejs -d tari_chk_sig_js .

# Making changes

This library needs to be regenerated and committed on an as-needed basis. As the parent repo references the compiled package directly