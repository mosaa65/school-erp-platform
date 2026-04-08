-- Add WebAuthn requirement flag for password+passkey flow
ALTER TABLE `users`
  ADD COLUMN `webauthn_required` TINYINT(1) NOT NULL DEFAULT 0;
