(() => {
  const form = document.getElementById("it4Form");
  const printButton = document.getElementById("printIt4");
  const year = document.getElementById("currentYear");
  const onboardingForm = document.getElementById("onboardingSubmissionForm");
  const onboardingResponse = document.getElementById("onboardingSubmitResponse");

  if (year) year.textContent = String(new Date().getFullYear());

  if (onboardingForm && onboardingResponse) {
    onboardingForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!onboardingForm.reportValidity()) return;

      const files = ["w4Pdf", "i9Pdf", "it4Pdf"].map((name) => onboardingForm.elements.namedItem(name).files[0]);
      if (files.some((file) => !file || file.size > 10 * 1024 * 1024 || !/\.pdf$/i.test(file.name) || (file.type && file.type !== "application/pdf"))) {
        onboardingResponse.textContent = "Choose a PDF no larger than 10 MB for each required form.";
        return;
      }
      if (files.reduce((sum, file) => sum + file.size, 0) > 25 * 1024 * 1024) {
        onboardingResponse.textContent = "The three PDFs together must be no larger than 25 MB.";
        return;
      }

      const submitButton = onboardingForm.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      onboardingResponse.textContent = "Submitting your forms...";

      try {
        const response = await fetch(onboardingForm.action, {
          method: "POST",
          body: new FormData(onboardingForm),
        });
        let payload;
        try {
          payload = await response.json();
        } catch (error) {
          throw new Error("The submission service is unavailable. Please contact Guardian Angel for help.");
        }
        if (!response.ok || payload.ok !== true) throw new Error(payload.message || "The forms could not be submitted.");

        onboardingResponse.textContent = payload.notificationSent
          ? `Your forms were received. Reference: ${payload.reference}.`
          : `Your forms were stored. Reference: ${payload.reference}. Please call Guardian Angel to let the office know the upload is ready.`;
        onboardingForm.reset();
      } catch (error) {
        onboardingResponse.textContent = error.message || "The forms could not be submitted. Please try again or contact Guardian Angel for a secure return method.";
      } finally {
        submitButton.disabled = false;
      }
    });
  }

  if (!form || !printButton) return;

  const field = (name) => form.elements.namedItem(name);
  const updateTotal = () => {
    const first = Number(field("dependentExemption").value || 0);
    const second = Number(field("maritalExemption").value || 0);
    const dependents = Number(field("dependents").value || 0);
    field("totalExemptions").value = String(first + second + dependents);
  };

  const today = new Date();
  const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
  field("signatureDate").value = localDate;
  ["dependentExemption", "maritalExemption", "dependents"].forEach((name) => {
    field(name).addEventListener("input", updateTotal);
  });
  form.addEventListener("reset", () => window.setTimeout(() => {
    field("signatureDate").value = localDate;
    updateTotal();
  }, 0));
  printButton.addEventListener("click", () => {
    updateTotal();
    if (!form.reportValidity()) return;
    window.print();
  });
  updateTotal();
})();
