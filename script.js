 
"use strict";

// Replace these with your Supabase Project URL and PUBLIC publishable/anon key.
// Never put a service-role or secret key in browser JavaScript.
const SUPABASE_URL = "https://tnvqfaouzmzzjwtdsjea.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_qwh7y3V4apu6YudjSLiyaA_PPtboZzb";

const WHATSAPP_NUMBER = "910321654987";

const LOCAL_PHOTOS = [
  "images.jpg",
  "Screenshot_20261028-113035.png",
  "Screenshot_20261028-113040.png",
  "Screenshot_20261028-113044.png",
  "Screenshot_20261028-113059.png",
  "image.png",
  "dress-green.jpg",
  "Screenshot_20261028-115237.png",
  "Screenshot_20261028-115309.png",
  "Screenshot_20261028-115354.png",
  "Screenshot_20261028-115402.png",
  "Screenshot_20261028-115415.png",
  "Screenshot_20261028-115423.png",
  "Screenshot_20261028-115431.png",
  "Screenshot_20261028-115457.png",
  "Screenshot_20261028-115508.png",
  "Screenshot_20261028-115546.png",
  "Screenshot_20261028-115559.png",
  "Screenshot_20261028-115615.png",
  "Screenshot_20261028-115639.png",
  "Screenshot_20261028-115652.png",
  "Screenshot_20261028-115711.png",
  "Screenshot_20261028-115723.png",
  "Screenshot_20261028-115750.png",
  "Screenshot_20261028-115828.png",
  "Screenshot_20261028-115839.png",
  "Screenshot_20261028-115851.png",
  "Screenshot_20261028-115904.png",
  "Screenshot_20261028-115939.png",
  "Screenshot_20261028-120007.png",
  "Screenshot_20261028-120032.png",
  "Screenshot_20261028-120100.png",
  "Screenshot_20261028-120110.png",
  "Screenshot_20261028-120121.png",
  "Screenshot_20261028-120136.png",
  "Screenshot_20261028-120152.png"
];

const $ = (selector) => document.querySelector(selector);

let supabaseClient = null;
let galleryItems = [];
let currentFilter = "All";
let isAdmin = false;

const escapeHTML = (value = "") =>
  String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);

function setStatus(selector, message, isError = false) {
  const element = $(selector);
  if (!element) return;
  element.textContent = message;
  element.style.color = isError ? "#f0a0a0" : "";
}

function setButtonBusy(button, busy, busyText = "Please wait...") {
  if (!button) return;
  if (busy) {
    button.dataset.originalText = button.textContent;
    button.disabled = true;
    button.textContent = busyText;
  } else {
    button.disabled = false;
    button.textContent = button.dataset.originalText || button.textContent;
  }
}

function hasSupabaseConfig() {
  return Boolean(
    window.supabase &&
    SUPABASE_URL.startsWith("https://") &&
    !SUPABASE_URL.includes("YOUR_") &&
    SUPABASE_PUBLIC_KEY &&
    !SUPABASE_PUBLIC_KEY.includes("YOUR_")
  );
}

function localGalleryItems() {
  return LOCAL_PHOTOS.map((filename, index) => ({
    id: `local-${index}`,
    title: `RAD Unique Design ${index + 1}`,
    category: "Other",
    imageUrl: `images/${filename}`,
    source: "local"
  }));
}

async function loadGallery() {
  galleryItems = localGalleryItems();

  if (supabaseClient) {
    const { data, error } = await supabaseClient
      .from("gallery_photos")
      .select("id, storage_path, title, category, created_at")
      .order("created_at", { ascending: false });

    if (!error && data) {
      const cloudItems = data.map((photo) => {
        const { data: imageData } = supabaseClient.storage
          .from("gallery")
          .getPublicUrl(photo.storage_path);

        return {
          ...photo,
          imageUrl: imageData.publicUrl,
          source: "cloud"
        };
      });

      galleryItems = [...cloudItems, ...galleryItems];
    } else if (error) {
      console.error("Gallery load error:", error.message);
      setStatus("#galleryMessage", "Showing local photos. Online gallery could not load.");
    }
  }

  renderGallery();
  if (isAdmin) renderAdminGallery();
}

function renderGallery() {
  const grid = $("#galleryGrid");
  if (!grid) return;

  const filtered = galleryItems.filter((item) =>
    currentFilter === "All" || item.category === currentFilter
  );

  if (!filtered.length) {
    grid.innerHTML = '<p class="empty-state">No photos in this category yet.</p>';
    return;
  }

  grid.innerHTML = filtered.map((item) => `
    <article class="gallery-card">
      <a href="${escapeHTML(item.imageUrl)}" target="_blank" rel="noopener"
         aria-label="View ${escapeHTML(item.title)}">
        <img src="${escapeHTML(item.imageUrl)}"
             alt="${escapeHTML(item.title)}"
             loading="lazy" decoding="async">
      </a>
      <div class="gallery-info">
        <div>
          <h3>${escapeHTML(item.title)}</h3>
          <span>${escapeHTML(item.category)}</span>
        </div>
        <a class="gallery-enquire"
           href="https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
             `Hi RAD Unique Design, I would like to enquire about: ${item.title}`
           )}"
           target="_blank" rel="noopener">Enquire ↗</a>
      </div>
    </article>
  `).join("");

  grid.querySelectorAll("img").forEach((img) => {
    img.addEventListener("error", () => {
      img.alt = "Image unavailable. Check the image filename.";
      img.style.aspectRatio = "4 / 3";
      img.style.objectFit = "contain";
    }, { once: true });
  });
}

function setupFilters() {
  $("#galleryFilters")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;

    currentFilter = button.dataset.filter;
    $("#galleryFilters").querySelectorAll(".filter-btn").forEach((item) => {
      item.classList.toggle("active", item === button);
    });
    renderGallery();
  });
}

function setupNavigation() {
  $("#menuToggle")?.addEventListener("click", () => {
    const nav = $("#navigation");
    nav?.classList.toggle("open");
  });

  $("#navigation")?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => $("#navigation")?.classList.remove("open"));
  });
}

function setupEnquiryForm() {
  $("#enquiryForm")?.addEventListener("submit", (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    const values = new FormData(form);
    const name = String(values.get("name") || "").trim();
    const phone = String(values.get("phone") || "").trim();
    const service = String(values.get("service") || "").trim();
    const message = String(values.get("message") || "").trim();

    if (!name || !phone || !service || !message) return;

    const text = [
      "Hello RAD Unique Design!",
      `Name: ${name}`,
      `Phone: ${phone}`,
      `Category: ${service}`,
      `Enquiry: ${message}`
    ].join("\n");

    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  });
}

async function loadApprovedFeedback() {
  const container = $("#approvedFeedback");
  if (!container) return;

  if (!supabaseClient) {
    container.innerHTML =
      '<p class="empty-state">Feedback will appear here after the website is connected.</p>';
    return;
  }

  const { data, error } = await supabaseClient
    .from("customer_feedback")
    .select("id, name, message, created_at")
    .eq("approved", true)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Feedback load error:", error.message);
    container.innerHTML =
      '<p class="empty-state">Feedback is temporarily unavailable.</p>';
    return;
  }

  if (!data.length) {
    container.innerHTML =
      '<p class="empty-state">Be one of our first customers to share feedback.</p>';
    return;
  }

  container.innerHTML = data.map((item) => `
    <article class="feedback-quote">
      <p>${escapeHTML(item.message)}</p>
      <strong>— ${escapeHTML(item.name)}</strong>
    </article>
  `).join("");
}

function setupFeedbackForm() {
  $("#feedbackForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    if (!supabaseClient) {
      setStatus("#feedbackStatus", "Feedback service is not connected yet.", true);
      return;
    }

    const button = form.querySelector('button[type="submit"]');
    setButtonBusy(button, true, "Submitting...");

    try {
      const name = $("#feedbackName").value.trim();
      const message = $("#feedbackText").value.trim();

      if (name.length < 2 || message.length < 5) {
        setStatus("#feedbackStatus", "Please enter your name and a longer message.", true);
        return;
      }

      const { error } = await supabaseClient
        .from("customer_feedback")
        .insert([{ name, message }]);

      if (error) throw error;

      form.reset();
      setStatus("#feedbackStatus", "Thank you! Your feedback was submitted for admin review.");
    } catch (error) {
      console.error("Feedback submit error:", error.message);
      setStatus("#feedbackStatus", "Could not submit feedback. Please try again later.", true);
    } finally {
      setButtonBusy(button, false);
    }
  });
}

function setupAdminDialog() {
  const dialog = $("#adminDialog");

  $("#openAdmin")?.addEventListener("click", async () => {
    if (!dialog) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    await checkExistingSession();
  });

  $("#closeAdmin")?.addEventListener("click", () => {
    if (dialog?.close) dialog.close();
    else dialog?.removeAttribute("open");
  });

  dialog?.addEventListener("click", (event) => {
    if (event.target === dialog && dialog.close) dialog.close();
  });

  $("#adminLoginForm")?.addEventListener("submit", loginAdmin);
  $("#logoutAdmin")?.addEventListener("click", logoutAdmin);
  $("#photoUploadForm")?.addEventListener("submit", uploadPhoto);
}

async function checkExistingSession() {
  if (!supabaseClient) {
    setStatus("#adminStatus", "Add your Supabase URL and public key in script.js first.", true);
    return;
  }

  const { data, error } = await supabaseClient.auth.getSession();
  if (error || !data.session) return;

  const { data: allowed, error: allowError } = await supabaseClient
    .rpc("is_site_admin");

  if (allowError || !allowed) {
    setStatus("#adminStatus", "This account is not authorised as a website admin.", true);
    await supabaseClient.auth.signOut();
    return;
  }

  showAdminDashboard();
}

async function loginAdmin(event) {
  event.preventDefault();

  if (!supabaseClient) {
    setStatus("#adminStatus", "Configure Supabase URL and public key in script.js.", true);
    return;
  }

  const button = event.currentTarget.querySelector('button[type="submit"]');
  setButtonBusy(button, true, "Signing in...");

  try {
    const email = $("#adminEmail").value.trim();
    const password = $("#adminPassword").value;

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const { data: allowed, error: allowError } = await supabaseClient.rpc("is_site_admin");

    if (allowError || !allowed) {
      await supabaseClient.auth.signOut();
      throw new Error("This account is not on the website admin allowlist.");
    }

    $("#adminLoginForm").reset();
    setStatus("#adminStatus", "");
    showAdminDashboard();
  } catch (error) {
    setStatus("#adminStatus", error.message || "Login failed. Check your credentials.", true);
  } finally {
    setButtonBusy(button, false);
  }
}

function showAdminDashboard() {
  isAdmin = true;
  $("#adminLoginForm")?.classList.add("hidden");
  $("#adminDashboard")?.classList.remove("hidden");
  setStatus("#adminStatus", "");
  renderAdminGallery();
  loadPendingFeedback();
}

async function logoutAdmin() {
  if (supabaseClient) await supabaseClient.auth.signOut();
  isAdmin = false;
  $("#adminDashboard")?.classList.add("hidden");
  $("#adminLoginForm")?.classList.remove("hidden");
  $("#adminLoginForm")?.reset();
  setStatus("#adminStatus", "You have been logged out.");
}

async function uploadPhoto(event) {
  event.preventDefault();
  if (!supabaseClient || !isAdmin) return;

  const button = event.currentTarget.querySelector('button[type="submit"]');
  setButtonBusy(button, true, "Uploading...");

  try {
    const file = $("#photoFile").files[0];
    const title = $("#photoTitle").value.trim();
    const category = $("#photoCategory").value;

    if (!file) throw new Error("Please select an image.");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      throw new Error("Choose a JPG, PNG or WebP image.");
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("Image must be 5 MB or smaller.");
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${crypto.randomUUID()}-${safeName}`;

    const { error: storageError } = await supabaseClient.storage
      .from("gallery")
      .upload(path, file, {
        cacheControl: "31536000",
        upsert: false,
        contentType: file.type
      });

    if (storageError) throw storageError;

    const { error: rowError } = await supabaseClient
      .from("gallery_photos")
      .insert([{ storage_path: path, title, category }]);

    if (rowError) {
      await supabaseClient.storage.from("gallery").remove([path]);
      throw rowError;
    }

    event.currentTarget.reset();
    setStatus("#uploadStatus", "Photo uploaded successfully!");
    await loadGallery();
  } catch (error) {
    console.error("Upload error:", error.message);
    setStatus("#uploadStatus", error.message || "Photo upload failed.", true);
  } finally {
    setButtonBusy(button, false);
  }
}

function renderAdminGallery() {
  const container = $("#adminGallery");
  if (!container) return;

  const cloudItems = galleryItems.filter((item) => item.source === "cloud");

  if (!cloudItems.length) {
    container.innerHTML = '<p class="empty-state">No online photos to manage yet.</p>';
    return;
  }

  container.innerHTML = cloudItems.map((item) => `
    <div class="admin-item">
      <strong>${escapeHTML(item.title)}</strong>
      <p>${escapeHTML(item.category)}</p>
      <div class="admin-item-actions">
        <button class="small-btn danger" type="button"
          data-delete-photo="${escapeHTML(item.id)}">Delete photo</button>
      </div>
    </div>
  `).join("");

  container.querySelectorAll("[data-delete-photo]").forEach((button) => {
    button.addEventListener("click", async () => {
      const item = cloudItems.find((photo) => photo.id === button.dataset.deletePhoto);
      if (!item || !confirm(`Delete "${item.title}" from the online gallery?`)) return;

      button.disabled = true;
      try {
        const { error: rowError } = await supabaseClient
          .from("gallery_photos")
          .delete()
          .eq("id", item.id);

        if (rowError) throw rowError;

        const { error: storageError } = await supabaseClient.storage
          .from("gallery")
          .remove([item.storage_path]);

        if (storageError) {
          console.warn("Photo record deleted; storage cleanup failed:", storageError.message);
        }

        await loadGallery();
      } catch (error) {
        alert(`Could not delete photo: ${error.message}`);
        button.disabled = false;
      }
    });
  });
}

async function loadPendingFeedback() {
  const container = $("#pendingFeedback");
  if (!container || !supabaseClient || !isAdmin) return;

  container.innerHTML = '<p class="empty-state">Loading pending feedback...</p>';

  const { data, error } = await supabaseClient
    .from("customer_feedback")
    .select("id, name, message, created_at")
    .eq("approved", false)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Pending feedback error:", error.message);
    container.innerHTML = '<p class="empty-state">Could not load feedback. Check the Supabase policies.</p>';
    return;
  }

  if (!data.length) {
    container.innerHTML = '<p class="empty-state">No feedback waiting for approval.</p>';
    return;
  }

  container.innerHTML = data.map((item) => `
    <article class="admin-item">
      <strong>${escapeHTML(item.name)}</strong>
      <p>${escapeHTML(item.message)}</p>
      <div class="admin-item-actions">
        <button class="small-btn" type="button" data-approve-feedback="${escapeHTML(item.id)}">Approve</button>
        <button class="small-btn danger" type="button" data-delete-feedback="${escapeHTML(item.id)}">Delete</button>
      </div>
    </article>
  `).join("");

  container.querySelectorAll("[data-approve-feedback]").forEach((button) => {
    button.addEventListener("click", () =>
      moderateFeedback(button.dataset.approveFeedback, true)
    );
  });

  container.querySelectorAll("[data-delete-feedback]").forEach((button) => {
    button.addEventListener("click", () => {
      if (confirm("Delete this feedback?")) {
        moderateFeedback(button.dataset.deleteFeedback, false, true);
      }
    });
  });
}

async function moderateFeedback(id, approve, deleteRow = false) {
  if (!supabaseClient || !isAdmin) return;

  let result;
  if (deleteRow) {
    result = await supabaseClient
      .from("customer_feedback")
      .delete()
      .eq("id", id);
  } else {
    result = await supabaseClient
      .from("customer_feedback")
      .update({ approved: approve })
      .eq("id", id);
  }

  if (result.error) {
    alert(`Could not update feedback: ${result.error.message}`);
    return;
  }

  await loadPendingFeedback();
  await loadApprovedFeedback();
}

async function init() {
  $("#year").textContent = new Date().getFullYear();

  if (hasSupabaseConfig()) {
    supabaseClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLIC_KEY
    );
  } else {
    setStatus(
      "#galleryMessage",
      "Local gallery mode: connect Supabase to enable online photo uploads and feedback."
    );
    setStatus(
      "#adminStatus",
      "Supabase is not configured. Add your project URL and public key in script.js.",
      true
    );
  }

  setupFilters();
  setupNavigation();
  setupEnquiryForm();
  setupFeedbackForm();
  setupAdminDialog();

  await loadGallery();
  await loadApprovedFeedback();
}

document.addEventListener("DOMContentLoaded", init);
