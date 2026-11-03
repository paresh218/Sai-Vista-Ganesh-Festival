// Apps Script has no WebCrypto RSA verification. Bundle the maintained RSA primitive only.
const forge = require('node-forge/lib/forge');
require('node-forge/lib/rsa');
require('node-forge/lib/sha256');
exports.verify = (input, signature, jwk) => {
  if (jwk.kty !== 'RSA' || (jwk.alg && jwk.alg !== 'RS256') || (jwk.use && jwk.use !== 'sig')) return false;
  const decode = value => {const base64=value.replace(/-/g, '+').replace(/_/g, '/');return forge.util.decode64(base64.padEnd(Math.ceil(base64.length/4)*4,'='));};
  const integer = value => new forge.jsbn.BigInteger(forge.util.bytesToHex(decode(value)), 16);
  const key = forge.pki.setRsaPublicKey(integer(jwk.n), integer(jwk.e));
  if (key.n.bitLength() < 2048) return false;
  const digest = forge.md.sha256.create().update(input, 'utf8').digest().getBytes();
  return key.verify(digest, decode(signature));
};
