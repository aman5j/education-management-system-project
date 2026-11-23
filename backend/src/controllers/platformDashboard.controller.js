
import { getPlatformConnection } from "../config/platformDb.js";
import getInstituteModel from "../models/Institute.js";

export const getPlatformDashboard = async (req, res, next) => {
  try {
    const connection = getPlatformConnection();
    const Institute = getInstituteModel(connection);

    const [
      totalInstitutes,
      activeInstitutes,
      suspendedInstitutes,
      pendingProvisioning,
      failedProvisioning,
    ] = await Promise.all([
      Institute.countDocuments(),
      Institute.countDocuments({ status: "active" }),
      Institute.countDocuments({ status: "suspended" }),
      Institute.countDocuments({
        provisioningStatus: { $in: ["pending", "provisioning"] },
      }),
      Institute.countDocuments({
        provisioningStatus: "failed",
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        user: req.platformUser.toSafeObject(),
        statistics: {
          totalInstitutes,
          activeInstitutes,
          suspendedInstitutes,
          pendingProvisioning,
          failedProvisioning,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
