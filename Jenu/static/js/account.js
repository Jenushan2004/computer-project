document.getElementById("changePasswordForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const errorEl = document.getElementById("changePasswordError");
  const successEl = document.getElementById("changePasswordSuccess");
  errorEl.style.display = "none";
  successEl.style.display = "none";

  const payload = {
    current_password: document.getElementById("currentPassword").value,
    new_password: document.getElementById("newPassword").value,
    confirm_password: document.getElementById("confirmPassword").value,
  };

  const res = await fetch("/api/account/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    errorEl.textContent = data.error || "Password update failed";
    errorEl.style.display = "block";
    return;
  }

  successEl.textContent = "Password updated. Your next change is due in 6 months.";
  successEl.style.display = "block";
  e.target.reset();

  setTimeout(() => window.location.reload(), 1500);
});
