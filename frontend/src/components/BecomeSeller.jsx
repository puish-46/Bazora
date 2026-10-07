import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useNavigation } from "../context/NavigationContext.jsx";
import { api, formatApiError } from "../services/api.js";

export default function BecomeSeller() {
  const { user } = useAuth();
  const { navigate } = useNavigation();

  // Form input state
  const [formData, setFormData] = useState({
    businessName: "",
    businessEmail: user?.email || "",
    phone: "",
  });

  // UI state
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [applicationStatus, setApplicationStatus] = useState(null); // 'pending' | 'submitted' | null
  const [serverError, setServerError] = useState(null);

  // Check if customer already has a pending seller application
  useEffect(() => {
    let isMounted = true;

    const checkExistingApplication = async () => {
      const storageKey = `bazora_seller_application_${user?.id || user?._id || user?.userId}`;
      const savedStatus = localStorage.getItem(storageKey);

      if (savedStatus === "pending") {
        if (isMounted) {
          setApplicationStatus("pending");
          setCheckingStatus(false);
        }
        return;
      }

      try {
        // Query store endpoint to see if user is already an approved seller or awaiting approval
        await api.get("/sellers/store");
        if (isMounted) {
          // If approved with an active store, direct them to the seller portal
          navigate("/seller");
        }
      } catch (err) {
        if (!isMounted) return;
        // Status 403 with approval message confirms seller record exists and is pending
        if (err.status === 403) {
          const msg = (err.message || "").toLowerCase();
          if (msg.includes("approved") || msg.includes("approval") || msg.includes("seller")) {
            setApplicationStatus("pending");
            localStorage.setItem(storageKey, "pending");
          }
        }
      } finally {
        if (isMounted) {
          setCheckingStatus(false);
        }
      }
    };

    checkExistingApplication();

    return () => {
      isMounted = false;
    };
  }, [user, navigate]);

  // Client-side field validation matching backend requirements
  const validateForm = () => {
    const errors = {};

    if (!formData.businessName.trim()) {
      errors.businessName = "Business name is required.";
    } else if (formData.businessName.trim().length < 2) {
      errors.businessName = "Business name must be at least 2 characters.";
    } else if (formData.businessName.trim().length > 100) {
      errors.businessName = "Business name cannot exceed 100 characters.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.businessEmail.trim()) {
      errors.businessEmail = "Business email is required.";
    } else if (!emailRegex.test(formData.businessEmail.trim())) {
      errors.businessEmail = "A valid business email address is required.";
    }

    if (!formData.phone.trim()) {
      errors.phone = "Phone number is required.";
    } else if (formData.phone.trim().length < 6) {
      errors.phone = "Phone number must be at least 6 characters.";
    } else if (formData.phone.trim().length > 25) {
      errors.phone = "Phone number cannot exceed 25 characters.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: null }));
    }
    if (serverError) {
      setServerError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);

    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const payload = {
        businessName: formData.businessName.trim(),
        businessEmail: formData.businessEmail.trim().toLowerCase(),
        phone: formData.phone.trim(),
      };

      const res = await api.post("/sellers/apply", payload);

      if (res?.success) {
        const storageKey = `bazora_seller_application_${user?.id || user?._id || user?.userId}`;
        localStorage.setItem(storageKey, "pending");
        setApplicationStatus("submitted");
      }
    } catch (err) {
      if (err.status === 409) {
        // Backend returned "Seller application already exists"
        const storageKey = `bazora_seller_application_${user?.id || user?._id || user?.userId}`;
        localStorage.setItem(storageKey, "pending");
        setApplicationStatus("pending");
      } else {
        setServerError(
          formatApiError(err, "Failed to submit seller application. Please check your information.")
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  // 1. Initial Status Check Loading State
  if (checkingStatus) {
    return (
      <div className="become-seller-container">
        <div className="seller-status-card">
          <div className="auth-spinner"></div>
          <p className="seller-status-loading">Verifying seller application status...</p>
        </div>
      </div>
    );
  }

  // 2. Successful Application Submitted State
  if (applicationStatus === "submitted") {
    return (
      <div className="become-seller-container">
        <div className="seller-status-card success">
          <div className="status-header">
            <span className="status-icon-wrap success">
              <span className="graph-node-pip success"></span>
            </span>
            <span className="section-index-tag">// STATUS: SUBMITTED</span>
            <h2>Application Submitted</h2>
            <p className="status-subtitle">
              Your seller application has been submitted successfully.
            </p>
          </div>

          <div className="status-details-box">
            <div className="status-row">
              <span className="status-label">Status</span>
              <span className="status-badge warning">
                <span className="graph-node-pip muted"></span>
                Pending Review
              </span>
            </div>
            <div className="status-row">
              <span className="status-label">Business Name</span>
              <span className="status-value">{formData.businessName}</span>
            </div>
            <div className="status-row">
              <span className="status-label">Business Email</span>
              <span className="status-value">{formData.businessEmail}</span>
            </div>
          </div>

          <p className="status-notice">
            An administrator will review your application. You will receive access to seller
            features after approval.
          </p>

          <div className="status-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={() => navigate("/dashboard")}
            >
              Back to Dashboard
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => navigate("/products")}
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Existing Pending Application State
  if (applicationStatus === "pending") {
    return (
      <div className="become-seller-container">
        <div className="seller-status-card pending">
          <div className="status-header">
            <span className="status-icon-wrap pending">
              <span className="graph-node-pip muted"></span>
            </span>
            <span className="section-index-tag">// STATUS: IN_REVIEW</span>
            <h2>Seller Application</h2>
            <p className="status-subtitle">
              Your seller application is currently being reviewed.
            </p>
          </div>

          <div className="status-details-box">
            <div className="status-row">
              <span className="status-label">Application Status</span>
              <span className="status-badge warning">
                <span className="graph-node-pip muted"></span>
                Pending Review
              </span>
            </div>
            <div className="status-row">
              <span className="status-label">Account</span>
              <span className="status-value">{user?.name || user?.email}</span>
            </div>
          </div>

          <p className="status-notice">
            An administrator is currently reviewing your business details. Once approved, your
            account will automatically be granted access to the Seller Portal, storefront
            configuration, and inventory controls.
          </p>

          <div className="status-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={() => navigate("/dashboard")}
            >
              Back to Dashboard
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => navigate("/products")}
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Default Application Form State
  return (
    <div className="become-seller-container">
      <div className="become-seller-card">
        {/* Section Header */}
        <div className="seller-card-header">
          <div className="seller-header-meta">
            <span className="section-index-tag">// 01 REGISTRATION</span>
            <h1 className="seller-card-title">Become a Seller</h1>
          </div>
          <p className="seller-card-desc">
            Submit your business details to apply for merchant verification on Bazora. An
            administrator will review your application before granting seller privileges.
          </p>
          <div className="section-hairline">
            <span className="graph-node-pip"></span>
          </div>
        </div>

        {/* Informational Callout */}
        <div className="seller-info-callout">
          <span className="callout-icon" aria-hidden="true">💡</span>
          <div className="callout-text">
            <strong>How it works:</strong> Once submitted, your profile enters the admin review queue.
            You will maintain your current customer account until an administrator approves your seller
            credentials.
          </div>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div className="alert alert-danger" role="alert">
            <span className="alert-icon">✕</span>
            <span>{serverError}</span>
          </div>
        )}

        {/* Application Form */}
        <form onSubmit={handleSubmit} className="become-seller-form" noValidate>
          {/* Business Name */}
          <div className={`form-group ${fieldErrors.businessName ? "has-error" : ""}`}>
            <label htmlFor="businessName">
              Business Name <span className="required-star">*</span>
            </label>
            <input
              id="businessName"
              type="text"
              name="businessName"
              placeholder="e.g., Apex Audio Technologies"
              value={formData.businessName}
              onChange={(e) => handleInputChange("businessName", e.target.value)}
              disabled={submitting}
              autoComplete="organization"
              required
            />
            {fieldErrors.businessName ? (
              <span className="field-error-text">{fieldErrors.businessName}</span>
            ) : (
              <span className="field-hint-text">
                Between 2 and 100 characters. This will be associated with your storefront.
              </span>
            )}
          </div>

          {/* Business Email */}
          <div className={`form-group ${fieldErrors.businessEmail ? "has-error" : ""}`}>
            <label htmlFor="businessEmail">
              Business Email <span className="required-star">*</span>
            </label>
            <input
              id="businessEmail"
              type="email"
              name="businessEmail"
              placeholder="e.g., support@apex-audio.com"
              value={formData.businessEmail}
              onChange={(e) => handleInputChange("businessEmail", e.target.value)}
              disabled={submitting}
              autoComplete="email"
              required
            />
            {fieldErrors.businessEmail ? (
              <span className="field-error-text">{fieldErrors.businessEmail}</span>
            ) : (
              <span className="field-hint-text">
                Official contact email used for order inquiries and admin communications.
              </span>
            )}
          </div>

          {/* Phone Number */}
          <div className={`form-group ${fieldErrors.phone ? "has-error" : ""}`}>
            <label htmlFor="phone">
              Phone Number <span className="required-star">*</span>
            </label>
            <input
              id="phone"
              type="tel"
              name="phone"
              placeholder="e.g., +1 555-019-2834"
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
              disabled={submitting}
              autoComplete="tel"
              required
            />
            {fieldErrors.phone ? (
              <span className="field-error-text">{fieldErrors.phone}</span>
            ) : (
              <span className="field-hint-text">
                Primary business telephone number (6 to 25 characters).
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="seller-form-actions">
            <button
              type="submit"
              className="btn-primary btn-submit-seller"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="btn-spinner" aria-hidden="true"></span>
                  <span>Submitting Application...</span>
                </>
              ) : (
                <span>Submit Application →</span>
              )}
            </button>

            <button
              type="button"
              className="btn-ghost"
              onClick={() => navigate("/dashboard")}
              disabled={submitting}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
