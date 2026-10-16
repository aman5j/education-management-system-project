
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiUser,
  FiMail,
  FiPhone,
  FiLock,
  FiSave,
  FiShield,
} from "react-icons/fi";

import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import "../../styles/AdminProfile.css";

const getInitials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "A";

const getError = (error, fallback) =>
  error?.response?.data?.message || fallback;

const Profile = () => {
  const navigate = useNavigate();
  const { user, updateUser, changePassword } = useAuth();

  const [profile, setProfile] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const handleProfileChange = (event) => {
    const { name, value } = event.target;

    setProfile((previous) => ({
      ...previous,
      [name]: value,
    }));

    setProfileError("");
    setProfileSuccess("");
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;

    setPasswordForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setPasswordError("");
    setPasswordSuccess("");
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setProfileError("");
    setProfileSuccess("");

    if (profile.name.trim().length < 2) {
      setProfileError("Name must contain at least 2 characters.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())) {
      setProfileError("Enter a valid email address.");
      return;
    }

    setSavingProfile(true);

    try {
      const response = await api.put("/auth/profile", {
        name: profile.name.trim(),
        email: profile.email.trim(),
        phone: profile.phone.trim(),
      });

      const updatedUser = response?.data?.data?.user;

      if (!updatedUser) {
        throw new Error("The server did not return the updated profile.");
      }

      updateUser(updatedUser);

      setProfile({
        name: updatedUser.name || "",
        email: updatedUser.email || "",
        phone: updatedUser.phone || "",
      });

      setProfileSuccess(
        response?.data?.message || "Profile updated successfully."
      );
    } catch (error) {
      setProfileError(
        getError(error, error.message || "Unable to update your profile.")
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      setPasswordError("Please complete all password fields.");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError("New password must contain at least 8 characters.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setPasswordError("Choose a new password different from the current one.");
      return;
    }

    setSavingPassword(true);

    try {
      const response = await changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword
      );

      setPasswordSuccess(
        response?.message ||
          "Password changed. Please sign in again."
      );

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      // The existing changePassword function clears the session.
      navigate("/login", {
        replace: true,
        state: {
          message: "Your password was changed. Please sign in again.",
        },
      });
    } catch (error) {
      setPasswordError(
        error?.message || "Unable to change your password."
      );
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="admin-profile-page">
       <div className="page-header">
        <div>
          <h1>
          My Profile
          </h1>

        </div>
      </div>

    <div class="profile-main">
 <div className="common-card admin-profile-left">
        <div className="admin-profile-avatar" aria-hidden="true">
          {user?.avatar ? (
            <img src={user.avatar} alt="" />
          ) : (
            getInitials(user?.name)
          )}
        </div>

        <div className="admin-profile-identity-info">
          <h2>{user?.name || "Administrator"}</h2>
          <p className="admin-profile-role"> <FiMail/> {user?.email || "No email available"}</p>
          <p className="admin-profile-role"> <FiPhone/> {user?.phone || "No phoe available"}</p>
          <p className="admin-profile-role">
            <FiShield /> {user?.role || "admin"}
          </p>
           <h6>Last login: 15 Oct 2026 21:34:49:657</h6>
          
          <div className="actionprofile">
            <button className="themebtn">Change Password</button>
          </div>
         
        </div>

        <span className="admin-profile-account-status">
          {user?.status || "active"}
        </span>
</div>

     <div className="profile-forms-right">
       <div className="common-card">
        <div class="panel-header"><div><h3>Basic Information</h3> </div></div>
        
        <div className="cardbody">

        {profileError && (
          <div className="admin-profile-alert error" role="alert">
            {profileError}
          </div>
        )}

        {profileSuccess && (
          <div className="admin-profile-alert success" role="status">
            {profileSuccess}
          </div>
        )}

        <form onSubmit={handleProfileSubmit}>
          <div className="admin-profile-form-grid">
            <label className="admin-profile-field">
              <span>Institute Name</span>
              <span className="admin-profile-input-wrap">
                
                <input
                  name="name"
                  value={profile.name}
                  onChange={handleProfileChange}
                  placeholder="Enter your full name"
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                  required
                />
              </span>
            </label>
             <label className="admin-profile-field">
              <span>Desigantion</span>
              <span className="admin-profile-input-wrap">
                
                <input
                  name="designation"
                 
                  placeholder="Enter your designation"
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                  required
                />
              </span>
            </label>
            
          

            <label className="admin-profile-field">
              <span>Email Address</span>
              <span className="admin-profile-input-wrap">
               
                <input
                  name="email"
                  type="email"
                  value={profile.email}
                  onChange={handleProfileChange}
                  placeholder="Enter your email"
                  maxLength={254}
                  autoComplete="email"
                  required
                />
              </span>
            </label>

           

            <div className="admin-profile-field">
              <span>Account Role</span>
              <div className="admin-profile-readonly">
               
                <span>{user?.role || "admin"}</span>
                <small>Managed by system permissions</small>
              </div>
            </div>
             <label className="admin-profile-field fullinput">
              <span>Upload Institute Logo  </span>
              <div className="signature-field">
     

      <div className="signature-upload-box">
        <div className="signature-upload-icon">
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M12 16V4m0 0L7 9m5-5 5 5M5 15v4h14v-4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <strong>Upload your Logo</strong>
        <button type="button" className="signature-browse-btn">
          Browse files
        </button>

       
      </div>
       <div className="signature-draw-box">
        <span className="signature-title">
          Preview of your Logo
        </span>

        <div className="signature-canvas">
          <svg
            viewBox="0 0 280 70"
            className="signature-demo"
            aria-hidden="true"
          >
            <path
              d="M20 45 Q35 20 45 38 T70 32 Q80 20 90 40
                 T115 35 Q130 30 140 36 T165 34
                 M85 48 Q95 8 105 15 M35 50 Q80 55 130 42
                 T200 38"
              fill="none"
              stroke="#9db2cb"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    </div>
            </label>
          </div>


          {/* <div className="admin-profile-form-footer">
            <button
              className="admin-profile-primary-button"
              type="submit"
              disabled={savingProfile}
            >
              <FiSave />
              {savingProfile ? "Saving..." : "Save Profile"}
            </button>
          </div> */}
          
        </form>
        </div>
      </div>
      <div className="common-card">
                <div class="panel-header"><div><h3>Contact Information</h3> </div></div>

 <div className="cardbody">


        {passwordError && (
          <div className="admin-profile-alert error" role="alert">
            {passwordError}
          </div>
        )}

        {passwordSuccess && (
          <div className="admin-profile-alert success" role="status">
            {passwordSuccess}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit}>
          <div className="admin-profile-form-grid">
            <label className="admin-profile-field">
              <span>Mobile Number</span>
              <span className="admin-profile-input-wrap">
               
                <input
                  name="phone"
                  type="tel"
                  value={profile.phone}
                  onChange={handleProfileChange}
                  placeholder="Enter your phone number"
                  maxLength={20}
                  autoComplete="tel"
                />
              </span>
            </label>

             <label className="admin-profile-field">
              <span>Alternate Mobile</span>
              <span className="admin-profile-input-wrap">
               
                <input
                  name="phone"
                  type="tel"
                  value={profile.phone}
                  onChange={handleProfileChange}
                  placeholder="Enter your phone number"
                  maxLength={20}
                  autoComplete="tel"
                />
              </span>
            </label>
             <label className="admin-profile-field">
              <span>State</span>
              <span className="admin-profile-input-wrap">
               
               <select>
  <option value="">Select State</option>
  <option value="MP">Madhya Pradesh</option>
  <option value="UP">Uttar Pradesh</option>
  <option value="BR">Bihar</option>
</select>
              </span>
            </label>
             <label className="admin-profile-field">
              <span>City</span>
              <span className="admin-profile-input-wrap">
               
                <input
                  name="phone"
                  type="tel"
                  
                 
                  placeholder="Gwalior"
                 
                />
              </span>
            </label>
             <label className="admin-profile-field">
              <span>Pincode</span>
              <span className="admin-profile-input-wrap">
               
                <input
                  name="phone"
                  type="tel"
                  
                  placeholder="Enter your pincode"
                  maxLength={6}
                  autoComplete="tel"
                />
              </span>
            </label>

            <label className="admin-profile-field fullinput">
              <span>Address</span>
              <textarea className="admin-profile-password-input"
                name="address"
                value={profile.address}
                onChange={handleProfileChange}
                placeholder="Enter your address"
                maxLength={500}
              />
            </label>
          </div>
        </form>
        </div>
      </div>

      <div className="common-card">
                <div class="panel-header"><div><h3>Certificate Information</h3> </div></div>

 <div className="cardbody">


        {passwordError && (
          <div className="admin-profile-alert error" role="alert">
            {passwordError}
          </div>
        )}

        {passwordSuccess && (
          <div className="admin-profile-alert success" role="status">
            {passwordSuccess}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit}>
          <div className="admin-profile-form-grid">
            <label className="admin-profile-field fullinput">
              <span>Controller of Examiner <span class="admin-profile-checkbox"> <input type="checkbox" /> Show Controller on Certificate</span> </span>
              <input
                className="admin-profile-password-input"
                type="text" placeholder="Enter Controller of Examiner"
              />
            </label>

            <label className="admin-profile-field fullinput">
              <span>Upload Controller Examiner Signature <span class="admin-profile-checkbox"> <input type="checkbox" /> Show Controller on Certificate</span> </span>
              <div className="signature-field">
     

      <div className="signature-upload-box">
        <div className="signature-upload-icon">
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M12 16V4m0 0L7 9m5-5 5 5M5 15v4h14v-4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <strong>Upload your signature</strong>
        <button type="button" className="signature-browse-btn">
          Browse files
        </button>

       
      </div>
       <div className="signature-draw-box">
        <span className="signature-title">
          Preview of your signature
        </span>

        <div className="signature-canvas">
          <svg
            viewBox="0 0 280 70"
            className="signature-demo"
            aria-hidden="true"
          >
            <path
              d="M20 45 Q35 20 45 38 T70 32 Q80 20 90 40
                 T115 35 Q130 30 140 36 T165 34
                 M85 48 Q95 8 105 15 M35 50 Q80 55 130 42
                 T200 38"
              fill="none"
              stroke="#9db2cb"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    </div>
            </label>

            
          </div>

          

         
        </form>
        </div>
      </div>

       <div className="common-card">
                <div class="panel-header"><div><h3>Owner Details</h3> </div></div>

 <div className="cardbody">


        {passwordError && (
          <div className="admin-profile-alert error" role="alert">
            {passwordError}
          </div>
        )}

        {passwordSuccess && (
          <div className="admin-profile-alert success" role="status">
            {passwordSuccess}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit}>
          <div className="admin-profile-form-grid">
            <label className="admin-profile-field fullinput">
              <span>Owner Name <span class="admin-profile-checkbox"> <input type="checkbox" /> Show Controller on Certificate</span> </span>
              <input
                className="admin-profile-password-input"
                type="text" placeholder="Enter Controller of Examiner"
              />
            </label>

            <label className="admin-profile-field fullinput">
              <span>Owner Photo  </span>
              <div className="signature-field">
     

      <div className="signature-upload-box">
        <div className="signature-upload-icon">
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M12 16V4m0 0L7 9m5-5 5 5M5 15v4h14v-4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <strong>Upload your Photo</strong>
        <button type="button" className="signature-browse-btn">
          Browse files
        </button>

       
      </div>
       <div className="signature-draw-box">
        <span className="signature-title">
          Preview of your Profile
        </span>

        <div className="signature-canvas">
          <svg
            viewBox="0 0 280 70"
            className="signature-demo"
            aria-hidden="true"
          >
            <path
              d="M20 45 Q35 20 45 38 T70 32 Q80 20 90 40
                 T115 35 Q130 30 140 36 T165 34
                 M85 48 Q95 8 105 15 M35 50 Q80 55 130 42
                 T200 38"
              fill="none"
              stroke="#9db2cb"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    </div>
            </label>

             <label className="admin-profile-field fullinput">
              <span>Owner Signature  </span>
              <div className="signature-field">
     

      <div className="signature-upload-box">
        <div className="signature-upload-icon">
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M12 16V4m0 0L7 9m5-5 5 5M5 15v4h14v-4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <strong>Upload your Signature</strong>
        <button type="button" className="signature-browse-btn">
          Browse files
        </button>

       
      </div>
       <div className="signature-draw-box">
        <span className="signature-title">
          Preview of your Owner Signature
        </span>

        <div className="signature-canvas">
          <svg
            viewBox="0 0 280 70"
            className="signature-demo"
            aria-hidden="true"
          >
            <path
              d="M20 45 Q35 20 45 38 T70 32 Q80 20 90 40
                 T115 35 Q130 30 140 36 T165 34
                 M85 48 Q95 8 105 15 M35 50 Q80 55 130 42
                 T200 38"
              fill="none"
              stroke="#9db2cb"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    </div>
            </label>


            
          </div>

          

         
        </form>
        </div>
        
      </div>
 <div className="admin-profile-form-footer">
            <button
              className="admin-profile-primary-button"
              type="submit"
              disabled={savingPassword}
            >
              <FiSave />
              {savingPassword ? "saving..." : "Save Details"}
            </button>
          </div>
     </div>
      
    </div>

    
    </div>
  );
};

export default Profile;
