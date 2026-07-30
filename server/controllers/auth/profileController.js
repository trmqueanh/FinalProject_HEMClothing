// Profile handlers: member profile data plus shipping address create/update/default/delete.
module.exports = ({
  buildProfileResponse,
  getDb,
  isValidUuid,
  normalizeAddressPayload,
  normalizeProfilePayload,
  sendError,
  userAddressModel,
  userModel
}) => {
  const controller = {};

controller.getProfile = async (req, res) => {
  try {
    const db = getDb(req);

    if (!req.authUser) {
      return res.status(401).json({
        message: 'Authentication required.'
      });
    }

    return res.json(await buildProfileResponse(db, req.authUser));
  } catch (error) {
    return sendError(res, error);
  }
};

controller.updateProfile = async (req, res) => {
  try {
    const db = getDb(req);

    if (!req.authUser) {
      return res.status(401).json({
        message: 'Authentication required.'
      });
    }

    const payload = normalizeProfilePayload(req.body);

    if (payload.name) {
      await userModel.updateName(db, req.authUser.id, payload.name);
    }

    await userModel.upsertProfile(db, req.authUser.id, payload);
    const user = await userModel.findByIdentity(db, {
      id: req.authUser.id,
      email: req.authUser.email
    });

    return res.json(await buildProfileResponse(db, user));
  } catch (error) {
    return sendError(res, error);
  }
};

controller.createAddress = async (req, res) => {
  try {
    const db = getDb(req);

    if (!req.authUser) {
      return res.status(401).json({
        message: 'Authentication required.'
      });
    }

    const payload = normalizeAddressPayload(req.body);
    const existingAddresses = await userAddressModel.listByUser(db, req.authUser.id);
    const shouldSetDefault = payload.isDefault || existingAddresses.rows.length === 0;
    await userAddressModel.create(db, req.authUser.id, payload, {
      setAsDefault: shouldSetDefault
    });

    const user = await userModel.findByIdentity(db, {
      id: req.authUser.id,
      email: req.authUser.email
    });

    return res.status(201).json(await buildProfileResponse(db, user));
  } catch (error) {
    return sendError(res, error);
  }
};

controller.updateAddress = async (req, res) => {
  try {
    const db = getDb(req);
    const addressId = String(req.params.addressId || '').trim();

    if (!req.authUser) {
      return res.status(401).json({
        message: 'Authentication required.'
      });
    }

    if (!isValidUuid(addressId)) {
      return res.status(400).json({
        message: 'Address id is required.'
      });
    }

    const payload = normalizeAddressPayload(req.body);
    const result = await userAddressModel.update(db, req.authUser.id, addressId, payload, {
      setAsDefault: payload.isDefault
    });

    if (!result.rowCount) {
      return res.status(404).json({
        message: 'Address not found.'
      });
    }

    const user = await userModel.findByIdentity(db, {
      id: req.authUser.id,
      email: req.authUser.email
    });

    return res.json(await buildProfileResponse(db, user));
  } catch (error) {
    return sendError(res, error);
  }
};

controller.setDefaultAddress = async (req, res) => {
  try {
    const db = getDb(req);
    const addressId = String(req.params.addressId || '').trim();

    if (!req.authUser) {
      return res.status(401).json({
        message: 'Authentication required.'
      });
    }

    if (!isValidUuid(addressId)) {
      return res.status(400).json({
        message: 'Address id is required.'
      });
    }

    const isUpdated = await userAddressModel.setDefault(db, req.authUser.id, addressId);

    if (!isUpdated) {
      return res.status(404).json({
        message: 'Address not found.'
      });
    }

    const user = await userModel.findByIdentity(db, {
      id: req.authUser.id,
      email: req.authUser.email
    });

    return res.json(await buildProfileResponse(db, user));
  } catch (error) {
    return sendError(res, error);
  }
};

controller.deleteAddress = async (req, res) => {
  try {
    const db = getDb(req);
    const addressId = String(req.params.addressId || '').trim();

    if (!req.authUser) {
      return res.status(401).json({
        message: 'Authentication required.'
      });
    }

    if (!isValidUuid(addressId)) {
      return res.status(400).json({
        message: 'Address id is required.'
      });
    }

    const result = await userAddressModel.remove(db, req.authUser.id, addressId);

    if (!result.rowCount) {
      return res.status(404).json({
        message: 'Address not found.'
      });
    }

    const user = await userModel.findByIdentity(db, {
      id: req.authUser.id,
      email: req.authUser.email
    });

    return res.json(await buildProfileResponse(db, user));
  } catch (error) {
    return sendError(res, error);
  }
};

  return controller;
};
