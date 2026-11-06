
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiUser,
  FiUsers,
  FiLock,
  FiCamera,
  FiSave,
  FiRefreshCw,
  FiAlertCircle,
  FiCheckCircle,
  FiEye,
  FiEyeOff,
} from "react-icons/fi";
import { FaIdCard } from "react-icons/fa";
import { IoMdInformationCircle } from "react-icons/io";


import { useAuth } from "../../context/AuthContext";
import studentPortalService from "../../services/studentPortalService";
import { getAssetUrl } from "../../utils/assetUrl";
import "./StudentProfile.css";
import { MdOutgoingMail } from "react-icons/md";
import { IoIosCall } from "react-icons/io";

const initialForm = {
  firstName: "",
  surname: "",
  fatherName: "",
  motherName: "",
  dob: "",
  gender: "",
  mobile: "",
  alternateMobile: "",
  address: "",
  pincode: "",
};

const getDateInput = (value) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
};

const errorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong. Please try again.";

export default function StudentProfile() {
  const navigate = useNavigate();
  const { user, updateUser, changePassword } = useAuth();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState("personal");
  const [form, setForm] = useState(initialForm);
  const [student, setStudent] = useState(null);
  const [loginEmail, setLoginEmail] = useState(user?.email || "");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [passwordVisibility, setPasswordVisibility] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await studentPortalService.getMyProfile();
      const data = response?.data || {};
      const profile = data.student || {};
      const account = data.account || {};

      setStudent(profile);
      setLoginEmail(account.email || user?.email || profile.email || "");

      setForm({
        firstName: profile.firstName || "",
        surname: profile.surname || "",
        fatherName: profile.fatherName || "",
        motherName: profile.motherName || "",
        dob: getDateInput(profile.dob),
        gender: profile.gender || "",
        mobile: profile.mobile || "",
        alternateMobile: profile.alternateMobile || "",
        address: profile.address || "",
        pincode: profile.pincode || "",
      });

      if (account.name) {
        updateUser({ name: account.name });
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [updateUser, user?.email]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (form.firstName.trim().length < 2) {
      setError("First name must contain at least 2 characters.");
      return;
    }

    setSaving(true);

    try {
      // Login email is intentionally excluded from this request.
      const response = await studentPortalService.updateMyProfile({
        firstName: form.firstName,
        surname: form.surname,
        fatherName: form.fatherName,
        motherName: form.motherName,
        dob: form.dob,
        gender: form.gender,
        mobile: form.mobile,
        alternateMobile: form.alternateMobile,
        address: form.address,
        pincode: form.pincode,
      });

      const updatedStudent = response?.data?.student;

      if (updatedStudent) {
        setStudent(updatedStudent);
      }

      if (response?.data?.account?.name) {
        updateUser({ name: response.data.account.name });
      }

      // Keep the account email displayed as the login email.
      if (response?.data?.account?.email) {
        setLoginEmail(response.data.account.email);
      }

      setSuccess(
        response?.message || "Profile updated successfully."
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setError("Choose a JPG, PNG or WEBP image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Profile photo must be 5 MB or smaller.");
      return;
    }

    setPhotoUploading(true);
    setError("");
    setSuccess("");

    try {
      const response =
        await studentPortalService.uploadMyProfilePhoto(file);

      setStudent((current) => ({
        ...current,
        profileImage: response?.data?.profileImage || "",
      }));

      setSuccess(response?.message || "Profile photo updated.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPhotoUploading(false);
    }
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (passwordForm.newPassword.length < 8) {
      setError("New password must contain at least 8 characters.");
      return;
    }

    if (
      passwordForm.newPassword !== passwordForm.confirmPassword
    ) {
      setError("New password and confirmation do not match.");
      return;
    }

    try {
      await changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword
      );

      navigate("/login", {
        replace: true,
        state: {
          message:
            "Password changed successfully. Please sign in again.",
        },
      });
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const imageUrl = student?.profileImage
    ? getAssetUrl(student.profileImage)
    : "";

  const displayName =
    [student?.firstName, student?.surname]
      .filter(Boolean)
      .join(" ") ||
    user?.name ||
    "Student";

  if (loading) {
    return (
      <div className="student-profile__loading">
        <FiRefreshCw className="student-profile__spin" />
        Loading your profile...
      </div>
    );
  }

  return (
    <div className="student-profile">
      {error && (
        <div className="student-profile__alert student-profile__alert--error">
          <FiAlertCircle />
          <span>{error}</span>
          <button type="button" onClick={() => setError("")}>
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div className="student-profile__alert student-profile__alert--success">
          <FiCheckCircle />
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess("")}>
            Dismiss
          </button>
        </div>
      )}


<section className="common-card">
  <div className="profile-header__banner"></div>

  <div className="profile-header__content">
    <div className="profile-header__image">
     {imageUrl ? (
                  <img src={imageUrl} alt={displayName} />
                ) : (
                  <span>
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                )}

                <div className="uploadicon"> <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={handlePhotoChange}
              />

              <button
                type="button"
                className="student-profile__photo-button"
                onClick={() => fileInputRef.current?.click()}
                disabled={photoUploading}
              >
                {photoUploading ? (
                  <FiRefreshCw className="student-profile__spin" />
                ) : (
                  <FiCamera />
                )}
                {photoUploading ? "Uploading..." : "Edit"}
              </button></div>

    </div>

    <div className="profile-header__details">
             <h1>{displayName}</h1>
                <img className="student-sign" src="https://education-management-backend-79g1.onrender.com/uploads/students/1792320172416-images.png" alt={displayName} />
              

      <div className="profile-header__meta">
        <div className="profile-header__item">
          <FaIdCard />

          <span>Roll No: {student?.rollNo || "—"}</span>
        </div>

     

        <div className="profile-header__item">
         <MdOutgoingMail />
          <span>{student?.email || "—"}</span>
        </div>

         <div className="profile-header__item">
          <IoIosCall />
          <span> {student?.mobile || "—"}</span>
        </div>
       
      </div>
    </div>
  </div>
</section>


      <div className="student-profile__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "personal"}
          className={activeTab === "personal" ? "active" : ""}
          onClick={() => setActiveTab("personal")}
        >
          <FiUser /> Personal Details
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "guardian"}
          className={activeTab === "guardian" ? "active" : ""}
          onClick={() => setActiveTab("guardian")}
        >
          <FiUsers /> Guardian Details
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "password"}
          className={activeTab === "password" ? "active" : ""}
          onClick={() => setActiveTab("password")}
        >
          <FiLock /> Change Password
        </button>
      </div>

      {activeTab === "personal" && (
        <form
          className="common-card"
          onSubmit={handleSaveProfile}
        >
          <div class="panel-header"><div><h3>Personal Information
</h3> 
<p>Update your personal and contact details.</p>
</div></div>
         
            
           
              <div className="cardbody">
                <div className="student-profile__fields">
                <div className="input-felid">
                <label>
                  First Name <span className="required">*</span>
                  </label>
                  <input
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    required
                    maxLength={80}
                  />
                
                </div>
<div className="input-felid">
                <label>
                  Surname
                  </label>
                  <input
                    name="surname"
                    value={form.surname}
                    onChange={handleChange}
                    maxLength={80}
                  />
                
                </div>

<div className="input-felid">
                <label>
                  Mobile Number <span className="required">*</span>
                  </label>
                  <input
                    name="mobile"
                    value={form.mobile}
                    onChange={handleChange}
                    required
                    maxLength={20}
                  />
            

                </div>
<div className="input-felid">
                <label>
                  Alternate Mobile
                  </label>
                  <input
                    name="alternateMobile"
                    value={form.alternateMobile}
                    onChange={handleChange}
                    maxLength={20}
                  />
             
               </div>

<div className="input-felid">
                <label  >
                  Login Email Address  <span className="infoicon tooltip" data-tooltip=" This email is your student login ID. Contact your
                    institute administrator if it needs to be changed." classNameinfoicon><IoMdInformationCircle />
</span>
                  </label>
                  <input 
                    type="email"
                    value={loginEmail}
                    readOnly
                    aria-readonly="true"
                    title="Your login email can only be managed by the institute administrator."
                  />
                 
              
              </div>

<div className="input-felid">
                <label>
                  Date of Birth
                  </label>
                  <input
                    type="date"
                    name="dob"
                    value={form.dob}
                    onChange={handleChange}
                  />
                </div>

<div className="input-felid">
                <label>
                  Gender
                </label>
                  <select
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  </div>
            

<div className="input-felid">
                <label>
                  Pincode
                      </label>
                  <input
                    name="pincode"
                    value={form.pincode}
                    onChange={handleChange}
                    maxLength={10}
                  />
            

                </div>
                  <div className="input-felid student-form-full">

                <label>
                  Address
                  </label>
                  <textarea

                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    rows={3}
                    maxLength={500}
                  />
               
               </div>
              </div>

              <div className="student-profile__actions">
                <button className="themebtn" type="submit" disabled={saving}>
                  {saving ? (
                    <FiRefreshCw className="student-profile__spin" />
                  ) : (
                    <FiSave />
                  )}
                  {saving ? "Saving..." : "Update Profile"}
                </button>
              </div>
              </div>
           
         
        </form>
      )}

      {activeTab === "guardian" && (
        <form
          className="common-card"
          onSubmit={handleSaveProfile}
        >

           <div class="panel-header"><div><h3>Guardian Information
</h3> 
<p>Manage the parent or guardian details associated with
              your student record.</p>
</div></div>


          <div className="cardbody">
             <div className="student-profile__fields student-profile__guardian-fields">
           <div className="input-felid">
            <label>
              Father's Name
             </label>
              <input
                name="fatherName"
                value={form.fatherName}
                onChange={handleChange}
                maxLength={100}
              />
       </div>

<div className="input-felid">
            <label>
              Mother's Name
              </label>
              <input
                name="motherName"
                value={form.motherName}
                onChange={handleChange}
                maxLength={100}
              />
              </div>
            
          </div>

          <div className="student-profile__actions">
            <button className="themebtn" type="submit" disabled={saving}>
              {saving ? (
                <FiRefreshCw className="student-profile__spin" />
              ) : (
                <FiSave />
              )}
              {saving ? "Saving..." : "Update Guardian Details"}
            </button>
          </div>
          </div>
        </form>
      )}

      {activeTab === "password" && (
        <form
          className="common-card"
          onSubmit={handlePasswordChange}
        >
         

          <div className="student-profile__password-fields cardbody">
            {[
              {
                name: "currentPassword",
                label: "Current Password *",
                autoComplete: "current-password",
              },
              {
                name: "newPassword",
                label: "New Password *",
                autoComplete: "new-password",
              },
              {
                name: "confirmPassword",
                label: "Confirm New Password *",
                autoComplete: "new-password",
              },
            ].map((field) => (
             
                <div className="student-profile__password-input-wrap input-felid"  key={field.name}>
                  <label>{field.label}</label>  
                  <input
                    type={
                      passwordVisibility[field.name] ? "text" : "password"
                    }
                    autoComplete={field.autoComplete}
                    minLength={
                      field.name === "currentPassword" ? undefined : 8
                    }
                    value={passwordForm[field.name]}
                    onChange={(event) =>
                      setPasswordForm((current) => ({
                        ...current,
                        [field.name]: event.target.value,
                      }))
                    }
                    required
                  />

                  <button
                    type="button"
                    className="student-profile__password-toggle"
                    aria-label={
                      passwordVisibility[field.name]
                        ? "Hide password"
                        : "Show password"
                    }
                    title={
                      passwordVisibility[field.name]
                        ? "Hide password"
                        : "Show password"
                    }
                    onClick={() =>
                      setPasswordVisibility((current) => ({
                        ...current,
                        [field.name]: !current[field.name],
                      }))
                    }
                  >
                    {passwordVisibility[field.name] ? (
                      <FiEyeOff />
                    ) : (
                      <FiEye />
                    )}
                  </button>
                </div>
            
            ))}
          </div>

            <div className="cardbody">
              <div className="student-profile__password-note">
            Your account will be signed out after the password is changed.
            Sign in again using your new password.
          </div>

          <div className="student-profile__actions">
            <button type="submit" className="themebtn">
              <FiLock /> Change Password
            </button>
          </div>
            </div>

        </form>
      )}
    </div>
  );
}
