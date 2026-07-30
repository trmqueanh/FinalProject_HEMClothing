// Auth session handlers: register/login, password reset/change, and current-user lookup.
const emailLogModel = require('../../models/emailLogModel');

module.exports = ({
  EMAIL_VERIFICATION_TTL_MS,
  PASSWORD_RULE_MESSAGE,
  buildEmailVerificationEmail,
  buildPasswordChangedEmail,
  buildPasswordResetEmail,
  buildWelcomeEmail,
  createEmailVerificationToken,
  createPasswordResetToken,
  createSessionPayload,
  emailVerificationFingerprintMatches,
  getClientBaseUrl,
  getDb,
  hashPassword,
  isStrongMemberPassword,
  isValidUuid,
  normalizeEmail,
  parseMemberBirthDate,
  passwordFingerprintMatches,
  passwordNeedsRehash,
  sendError,
  sendTransactionalEmail,
  serializeUser,
  userModel,
  verifyEmailVerificationToken,
  verifyPassword,
  verifyPasswordResetToken
}) => {
  const controller = {};
  const VERIFICATION_MESSAGE = 'Please check your email to verify your HEM account.';
  const RESET_MESSAGE = 'If an account exists for this email, password reset instructions will be sent.';

  const isAccountEmailVerified = account => account && account.email_verified !== false;

  const getVerificationExpiryDate = () => new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);

  const isPendingVerificationExpired = account => {
    if (!account || isAccountEmailVerified(account)) {
      return false;
    }

    const expiresAt = account.email_verification_expires_at || account.emailVerificationExpiresAt;
    const fallbackCreatedAt = account.created_at || account.createdAt;
    const expiresAtMs = expiresAt
      ? new Date(expiresAt).getTime()
      : fallbackCreatedAt
        ? new Date(fallbackCreatedAt).getTime() + EMAIL_VERIFICATION_TTL_MS
        : 0;

    return !expiresAtMs || Number.isNaN(expiresAtMs) || expiresAtMs <= Date.now();
  };

  const createVerificationUrl = (req, user) => {
    const token = createEmailVerificationToken(user);
    return `${getClientBaseUrl(req)}/verify-email?token=${encodeURIComponent(token)}`;
  };

  const sendVerificationEmail = async (req, db, user) => {
    const expiresAt = getVerificationExpiryDate();
    const result = await userModel.updateVerificationExpiry(db, user.id, expiresAt);
    const account = result.rows[0] || user;
    const verificationUrl = createVerificationUrl(req, account);
    const emailMessage = await sendTransactionalEmail(buildEmailVerificationEmail(req, account, verificationUrl));

    return {
      account,
      emailMessage
    };
  };

  const verificationRequiredPayload = (user, emailMessage = null) => ({
    message: VERIFICATION_MESSAGE,
    requiresEmailVerification: true,
    email: normalizeEmail(user.email),
    user: serializeUser(user),
    verificationEmail: emailMessage
  });

  const createAccountEventKey = (eventName, user, marker = '') =>
    ['account', eventName, String(user && user.id || ''), marker]
      .map(value => String(value || '').trim())
      .filter(Boolean)
      .join(':');

  const timestampMarker = value => {
    const time = new Date(value || Date.now()).getTime();
    return Number.isFinite(time) ? String(time) : String(Date.now());
  };

  const sendLoggedEmailOnce = async (db, eventKey, message, metadata = {}, options = {}) => {
    const insertResult = await emailLogModel.createOnce(db, {
      eventKey,
      recipientEmail: normalizeEmail(message.to),
      subject: String(message.subject || ''),
      metadata
    });

    if (!insertResult.rowCount) {
      return {
        skipped: true,
        duplicate: true,
        eventKey,
        subject: message.subject,
        to: message.to
      };
    }

    const logId = insertResult.rows[0].id;

    try {
      const delivery = await sendTransactionalEmail(message);
      await emailLogModel.markSent(db, logId, delivery);

      return {
        ...delivery,
        eventKey
      };
    } catch (error) {
      await emailLogModel.markFailed(db, logId, error && error.message);

      if (options.failOpen) {
        return {
          error: true,
          eventKey,
          subject: message.subject,
          to: message.to,
          message: error && error.message ? error.message : 'Unable to send email.'
        };
      }

      throw error;
    }
  };

  const sendPasswordChangedEmail = async (req, db, user) =>
    sendLoggedEmailOnce(
      db,
      createAccountEventKey('password_changed', user, timestampMarker(user.updated_at || user.updatedAt)),
      buildPasswordChangedEmail(req, user),
      { userId: String(user.id), emailType: 'password_changed' },
      { failOpen: true }
    );

controller.register = async (req, res) => {
  try {
    const db = getDb(req);
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');
    const confirmPassword = String(req.body.confirmPassword || req.body.confirm_password || password);
    const fullName = String(req.body.fullName || req.body.full_name || req.body.name || '').trim();
    const name = String(req.body.name || fullName || email.split('@')[0] || 'HEM Member').trim();
    const birthDate = parseMemberBirthDate(req.body.birthDate || req.body.birth_date);

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required.'
      });
    }

    if (!isStrongMemberPassword(password)) {
      return res.status(400).json({
        message: PASSWORD_RULE_MESSAGE
      });
    }

    if (confirmPassword !== password) {
      return res.status(400).json({
        message: 'Password confirmation does not match.'
      });
    }

    if (!birthDate) {
      return res.status(400).json({
        message: 'Birth date is required in dd/mm/yyyy format.'
      });
    }

    await userModel.deleteExpiredPendingByEmail(db, email);

    const existingAccount = await userModel.findByEmail(db, email);

    if (existingAccount) {
      if (!isAccountEmailVerified(existingAccount)) {
        const { account, emailMessage } = await sendVerificationEmail(req, db, existingAccount);

        return res.status(202).json(verificationRequiredPayload(account, emailMessage));
      }

      return res.status(409).json({
        message: 'This email is already registered.'
      });
    }

    const user = await userModel.createPendingMember(
      db,
      {
        name,
        email,
        passwordHash: hashPassword(password),
        role: 'user',
        verificationExpiresAt: getVerificationExpiryDate()
      },
      {
        name,
        fullName: fullName || name,
        phone: '',
        gender: '',
        birthDate,
        avatarUrl: '',
        paymentProvider: 'cod',
        cardHolderName: '',
        cardLast4: '',
        cardBrand: ''
      }
    );

    const verificationUrl = createVerificationUrl(req, user);
    const verificationEmail = await sendTransactionalEmail(buildEmailVerificationEmail(req, user, verificationUrl));

    return res.status(201).json({
      ...verificationRequiredPayload(user, verificationEmail)
    });
  } catch (error) {
    return sendError(res, error);
  }
};

controller.checkEmail = async (req, res) => {
  try {
    const db = getDb(req);
    const email = normalizeEmail(req.body.email);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        message: 'Please enter a valid email address.'
      });
    }

    await userModel.deleteExpiredPendingByEmail(db, email);

    const account = await userModel.findByEmail(db, email);

    return res.json({
      email,
      exists: Boolean(account),
      pendingVerification: Boolean(account && !isAccountEmailVerified(account)),
      verified: Boolean(account && isAccountEmailVerified(account))
    });
  } catch (error) {
    return sendError(res, error);
  }
};

controller.login = async (req, res) => {
  try {
    const db = getDb(req);
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required.'
      });
    }

    const user = await userModel.findByEmail(db, email);

    if (!user || !verifyPassword(password, user)) {
      return res.status(401).json({
        message: 'Invalid email or password.'
      });
    }

    if (String(user.status || 'active').toLowerCase() === 'inactive') {
      return res.status(403).json({
        code: 'ACCOUNT_INACTIVE',
        message: 'Your account is inactive. Please contact HEM Customer Care.'
      });
    }

    if (!isAccountEmailVerified(user)) {
      if (isPendingVerificationExpired(user)) {
        await userModel.deletePendingById(db, user.id);

        return res.status(410).json({
          code: 'EMAIL_VERIFICATION_EXPIRED',
          message: 'Your email verification window expired. Please create your account again.',
          email
        });
      }

      return res.status(403).json({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email before signing in.',
        email
      });
    }

    if (passwordNeedsRehash(user)) {
      const upgradedHash = hashPassword(password);
      await userModel.updatePasswordHash(db, user.id, upgradedHash, {
        expectedHash: user.password_hash
      });
      user.password_hash = upgradedHash;
    }

    return res.json(createSessionPayload(user));
  } catch (error) {
    return sendError(res, error);
  }
};

controller.requestPasswordReset = async (req, res) => {
  try {
    const db = getDb(req);
    const email = normalizeEmail(req.body.email);

    if (!email) {
      return res.status(400).json({
        message: 'Email is required.'
      });
    }

    await userModel.deleteExpiredPendingByEmail(db, email);

    const account = await userModel.findByEmail(db, email);

    if (!account || !isAccountEmailVerified(account)) {
      return res.json({
        message: RESET_MESSAGE,
        email: null
      });
    }

    const token = createPasswordResetToken(account);
    const resetUrl = `${getClientBaseUrl(req)}/reset-password?token=${encodeURIComponent(token)}`;
    const emailMessage = await sendTransactionalEmail(buildPasswordResetEmail(req, account, resetUrl));

    return res.json({
      message: RESET_MESSAGE,
      email: emailMessage
    });
  } catch (error) {
    return sendError(res, error);
  }
};

controller.resetPassword = async (req, res) => {
  try {
    const db = getDb(req);
    const tokenPayload = verifyPasswordResetToken(req.body.token);
    const password = String(req.body.password || '');

    if (!tokenPayload || !isValidUuid(tokenPayload.sub)) {
      return res.status(400).json({
        message: 'Password reset link is invalid or expired.'
      });
    }

    if (!isStrongMemberPassword(password)) {
      return res.status(400).json({
        message: PASSWORD_RULE_MESSAGE
      });
    }

    const account = await userModel.findByIdentity(db, {
      id: tokenPayload.sub,
      email: tokenPayload.email
    });

    if (
      !account ||
      normalizeEmail(account.email) !== normalizeEmail(tokenPayload.email) ||
      !isAccountEmailVerified(account) ||
      !passwordFingerprintMatches(tokenPayload, account.password_hash)
    ) {
      return res.status(400).json({
        message: 'Password reset link is invalid or expired.'
      });
    }

    const result = await userModel.updatePasswordHash(db, tokenPayload.sub, hashPassword(password), {
      expectedHash: account.password_hash
    });

    const updatedUser = result.rows[0];

    if (!updatedUser) {
      return res.status(400).json({
        message: 'Password reset link is invalid or expired.'
      });
    }

    const passwordChangedEmail = await sendPasswordChangedEmail(req, db, updatedUser);

    return res.json({
      message: 'Password updated successfully.',
      user: serializeUser(updatedUser),
      passwordChangedEmail
    });
  } catch (error) {
    return sendError(res, error);
  }
};

controller.verifyEmail = async (req, res) => {
  try {
    const db = getDb(req);
    const tokenPayload = verifyEmailVerificationToken(req.body.token || req.query.token);

    if (!tokenPayload || !isValidUuid(tokenPayload.sub)) {
      return res.status(400).json({
        message: 'Email verification link is invalid or expired.'
      });
    }

    const account = await userModel.findByIdentity(db, {
      id: tokenPayload.sub,
      email: tokenPayload.email
    });

    if (
      !account ||
      normalizeEmail(account.email) !== normalizeEmail(tokenPayload.email) ||
      !emailVerificationFingerprintMatches(tokenPayload, account.password_hash)
    ) {
      return res.status(400).json({
        message: 'Email verification link is invalid or expired.'
      });
    }

    if (isAccountEmailVerified(account)) {
      return res.json({
        message: 'Email is already verified. Please login to continue.',
        verified: true,
        user: serializeUser(account)
      });
    }

    if (isPendingVerificationExpired(account)) {
      await userModel.deletePendingById(db, account.id);

      return res.status(400).json({
        code: 'EMAIL_VERIFICATION_EXPIRED',
        message: 'Email verification expired. Please create your account again.'
      });
    }

    const result = await userModel.verifyEmail(db, account.id);
    const verifiedUser = result.rows[0];

    if (!verifiedUser) {
      return res.status(400).json({
        message: 'Email verification link is invalid or expired.'
      });
    }

    const welcomeEmail = await sendLoggedEmailOnce(
      db,
      createAccountEventKey('welcome', verifiedUser),
      buildWelcomeEmail(req, verifiedUser),
      { userId: String(verifiedUser.id), emailType: 'welcome' },
      { failOpen: true }
    );

    return res.json({
      message: 'Email verified successfully.',
      verified: true,
      ...createSessionPayload(verifiedUser),
      welcomeEmail
    });
  } catch (error) {
    return sendError(res, error);
  }
};

controller.resendEmailVerification = async (req, res) => {
  try {
    const db = getDb(req);
    const email = normalizeEmail(req.body.email);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        message: 'Please enter a valid email address.'
      });
    }

    await userModel.deleteExpiredPendingByEmail(db, email);

    const account = await userModel.findByEmail(db, email);

    if (!account || isAccountEmailVerified(account)) {
      return res.json({
        message: VERIFICATION_MESSAGE,
        email: null
      });
    }

    const { emailMessage } = await sendVerificationEmail(req, db, account);

    return res.json({
      message: VERIFICATION_MESSAGE,
      email: normalizeEmail(account.email),
      verificationEmail: emailMessage
    });
  } catch (error) {
    return sendError(res, error);
  }
};

controller.changePassword = async (req, res) => {
  try {
    const db = getDb(req);

    if (!req.authUser) {
      return res.status(401).json({
        message: 'Authentication required.'
      });
    }

    const currentPassword = String(req.body.currentPassword || req.body.current_password || '');
    const nextPassword = String(req.body.password || req.body.newPassword || req.body.new_password || '');

    if (!currentPassword || !nextPassword) {
      return res.status(400).json({
        message: 'Current password and new password are required.'
      });
    }

    if (!isStrongMemberPassword(nextPassword)) {
      return res.status(400).json({
        message: PASSWORD_RULE_MESSAGE
      });
    }

    const account = await userModel.findByIdentity(db, {
      id: req.authUser.id,
      email: req.authUser.email
    });

    if (!account || !verifyPassword(currentPassword, account)) {
      return res.status(401).json({
        message: 'Current password is incorrect.'
      });
    }

    if (verifyPassword(nextPassword, account)) {
      return res.status(400).json({
        message: 'New password must be different from your current password.'
      });
    }

    const result = await userModel.updatePasswordHash(db, req.authUser.id, hashPassword(nextPassword));
    const updatedUser = result.rows[0] || account;
    const passwordChangedEmail = await sendPasswordChangedEmail(req, db, updatedUser);

    return res.json({
      message: 'Password updated successfully.',
      passwordChangedEmail
    });
  } catch (error) {
    return sendError(res, error);
  }
};

controller.me = async (req, res) => {
  try {
    if (!req.authUser) {
      return res.status(401).json({
        message: 'Authentication required.'
      });
    }

    return res.json({
      user: req.authUser
    });
  } catch (error) {
    return sendError(res, error);
  }
};

  return controller;
};
