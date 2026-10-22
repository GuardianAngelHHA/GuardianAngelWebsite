(() => {
  const year = document.getElementById("currentYear");
  const onboardingForm = document.getElementById("onboardingSubmissionForm");
  const onboardingResponse = document.getElementById("onboardingSubmitResponse");
  const w4Form = document.getElementById("w4Form");
  const i9Form = document.getElementById("i9Form");
  const it4Form = document.getElementById("it4Form");
  const pdfLib = window.PDFLib;
  const PDF_BASE = "Forms/";

  if (year) year.textContent = String(new Date().getFullYear());

  const value = (form, name) => String(form.elements.namedItem(name)?.value || "").trim();
  const checked = (form, name) => Boolean(form.elements.namedItem(name)?.checked);
  const formatDate = (isoDate) => {
    if (!isoDate) return "";
    const [yearPart, month, day] = isoDate.split("-");
    return `${month}/${day}/${yearPart}`;
  };

  function downloadBytes(bytes, filename) {
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  async function loadTemplate(filename) {
    if (!pdfLib?.PDFDocument) throw new Error("The PDF form tool did not load. Refresh the page and try again.");
    const response = await fetch(`${PDF_BASE}${filename}`, { cache: "no-store" });
    if (!response.ok) throw new Error("The official PDF template could not be loaded. Please contact Guardian Angel.");
    return pdfLib.PDFDocument.load(await response.arrayBuffer());
  }

  function fillTextField(form, name, text) {
    if (text) form.getTextField(name).setText(text);
  }

  async function makeW4() {
    const form = w4Form;
    const pdf = await loadTemplate("Employee_W-4_2026.pdf");
    const pdfForm = pdf.getForm();
    const fields = {
      "topmostSubform[0].Page1[0].Step1a[0].f1_01[0]": value(form, "firstMiddle"),
      "topmostSubform[0].Page1[0].Step1a[0].f1_02[0]": value(form, "lastName"),
      "topmostSubform[0].Page1[0].Step1a[0].f1_03[0]": value(form, "address"),
      "topmostSubform[0].Page1[0].Step1a[0].f1_04[0]": value(form, "cityStateZip"),
      "topmostSubform[0].Page1[0].f1_05[0]": value(form, "ssn"),
    };
    Object.entries(fields).forEach(([name, text]) => fillTextField(pdfForm, name, text));

    const filing = form.querySelector('input[name="filingStatus"]:checked')?.value;
    const statusChecks = {
      single: "topmostSubform[0].Page1[0].c1_1[0]",
      married: "topmostSubform[0].Page1[0].c1_1[1]",
      head: "topmostSubform[0].Page1[0].c1_1[2]",
    };
    if (filing) pdfForm.getCheckBox(statusChecks[filing]).check();
    if (checked(form, "multipleJobs")) pdfForm.getCheckBox("topmostSubform[0].Page1[0].c1_2[0]").check();

    const optionalValues = {
      "topmostSubform[0].Page1[0].f1_08[0]": value(form, "credits"),
      "topmostSubform[0].Page1[0].f1_09[0]": value(form, "otherIncome"),
      "topmostSubform[0].Page1[0].f1_10[0]": value(form, "deductions"),
      "topmostSubform[0].Page1[0].f1_11[0]": value(form, "extraWithholding"),
    };
    Object.entries(optionalValues).forEach(([name, text]) => fillTextField(pdfForm, name, text));
    if (checked(form, "exempt")) pdfForm.getCheckBox("topmostSubform[0].Page1[0].c1_3[0]").check();

    pdfForm.updateFieldAppearances();
    return pdf.save();
  }

  function showI9StatusFields() {
    if (!i9Form) return;
    const status = i9Form.querySelector('input[name="status"]:checked')?.value || "";
    const group = document.getElementById("i9IdentifierFields");
    const show = (id, visible) => {
      const wrapper = document.getElementById(id);
      wrapper.hidden = !visible;
      const control = wrapper.querySelector("input, select");
      control.required = visible && id !== "i9ExpirationWrap";
      if (!visible) control.value = "";
    };
    group.hidden = status !== "permanent" && status !== "authorized";
    show("i9ANumberWrap", status === "permanent");
    show("i9ExpirationWrap", status === "authorized");
    show("i9IdentifierTypeWrap", status === "authorized");
    const identifierType = value(i9Form, "identifierType");
    show("i9IdentifierValueWrap", status === "authorized" && Boolean(identifierType));
    show("i9PassportCountryWrap", status === "authorized" && identifierType === "passport");
  }

  async function makeI9() {
    const pdf = await loadTemplate("Employment_Eligibility_I-9.pdf");
    const pdfForm = pdf.getForm();
    const fields = {
      "Last Name (Family Name)": value(i9Form, "lastName"),
      "First Name Given Name": value(i9Form, "firstName"),
      "Employee Middle Initial (if any)": value(i9Form, "middleInitial").slice(0, 1),
      "Employee Other Last Names Used (if any)": value(i9Form, "otherLastNames"),
      "Address Street Number and Name": value(i9Form, "address"),
      "Apt Number (if any)": value(i9Form, "apt"),
      "City or Town": value(i9Form, "city"),
      "ZIP Code": value(i9Form, "zip"),
      "Date of Birth mmddyyyy": formatDate(value(i9Form, "dob")),
      "US Social Security Number": value(i9Form, "ssn"),
      "Employees E-mail Address": value(i9Form, "email"),
      "Telephone Number": value(i9Form, "phone"),
    };
    Object.entries(fields).forEach(([name, text]) => fillTextField(pdfForm, name, text));
    pdfForm.getDropdown("State").select(value(i9Form, "state").toUpperCase());

    const status = i9Form.querySelector('input[name="status"]:checked')?.value;
    const statusChecks = { citizen: "CB_1", national: "CB_2", permanent: "CB_3", authorized: "CB_4" };
    if (status) pdfForm.getCheckBox(statusChecks[status]).check();
    if (status === "permanent") fillTextField(pdfForm, "3 A lawful permanent resident Enter USCIS or ANumber", value(i9Form, "aNumber"));
    if (status === "authorized") {
      fillTextField(pdfForm, "Exp Date mmddyyyy", formatDate(value(i9Form, "expirationDate")));
      const identifierType = value(i9Form, "identifierType");
      const identifierNames = {
        aNumber: "USCIS ANumber",
        i94: "Form I94 Admission Number",
        passport: "Foreign Passport Number and Country of IssuanceRow1",
      };
      let identifierValue = value(i9Form, "identifierValue");
      if (identifierType === "passport") identifierValue += `, ${value(i9Form, "passportCountry")}`;
      fillTextField(pdfForm, identifierNames[identifierType], identifierValue);
    }

    pdfForm.updateFieldAppearances();
    return pdf.save();
  }

  async function makeIT4() {
    const pdf = await loadTemplate("Ohio_IT-4.pdf");
    const page = pdf.getPage(0);
    const font = await pdf.embedFont(pdfLib.StandardFonts.Helvetica);
    const boldFont = await pdf.embedFont(pdfLib.StandardFonts.HelveticaBold);
    const height = page.getHeight();
    const draw = (text, x, top, size = 9, fontFace = font, maxWidth) => {
      const options = { x, y: height - top - size, size, font: fontFace };
      if (maxWidth) options.maxWidth = maxWidth;
      page.drawText(String(text || ""), options);
    };
    const waiverBoxes = [...it4Form.querySelectorAll('input[name="waiver"]')];
    const personalData = [
      ["employeeName", 40, 210, 10, 470],
      ["ssn", 365, 210, 10, 200],
      ["address", 40, 246, 10, 520],
      ["schoolDistrict", 40, 284, 9, 300],
      ["schoolDistrictNumber", 365, 284, 10, 150],
    ];
    const exemptionData = [
      ["dependentExemption", 520, 346, 10, 45],
      ["maritalExemption", 520, 370, 10, 45],
      ["dependents", 520, 394, 10, 45],
      ["totalExemptions", 520, 418, 10, 45],
      ["additionalWithholding", 520, 442, 10, 45],
    ];
    personalData.forEach(([name, x, top, size, maxWidth]) => draw(value(it4Form, name), x, top, size, font, maxWidth));
    if (!waiverBoxes.some((box) => box.checked)) {
      exemptionData.forEach(([name, x, top, size, maxWidth]) => draw(value(it4Form, name), x, top, size, font, maxWidth));
    }
    waiverBoxes.forEach((box, index) => {
      if (box.checked) draw("X", 43, [509, 533, 557, 581, 617][index], 10, boldFont);
    });
    return pdf.save();
  }

  const downloadHandlers = {
    w4: { form: w4Form, response: document.getElementById("w4Response"), filename: "completed-w4-2026.pdf", make: makeW4 },
    i9: { form: i9Form, response: document.getElementById("i9Response"), filename: "completed-i9.pdf", make: makeI9 },
    it4: { form: it4Form, response: document.getElementById("it4Response"), filename: "completed-ohio-it4.pdf", make: makeIT4 },
  };

  document.querySelectorAll("[data-download-form]").forEach((button) => {
    button.addEventListener("click", async () => {
      const task = downloadHandlers[button.dataset.downloadForm];
      if (!task || !task.form.reportValidity()) return;
      task.response.textContent = "Preparing your completed PDF...";
      button.disabled = true;
      try {
        const bytes = await task.make();
        downloadBytes(bytes, task.filename);
        task.response.textContent = "Your completed PDF was downloaded. Its signature and date are blank; sign it through Guardian Angel’s approved process before submitting.";
      } catch (error) {
        task.response.textContent = error.message || "The PDF could not be created. Please contact Guardian Angel for help.";
      } finally {
        button.disabled = false;
      }
    });
  });

  if (w4Form) {
    const exempt = w4Form.elements.namedItem("exempt");
    const affectedNames = ["multipleJobs", "credits", "otherIncome", "deductions", "extraWithholding"];
    const updateExemptFields = () => {
      affectedNames.forEach((name) => {
        const control = w4Form.elements.namedItem(name);
        if (exempt.checked && control.type === "checkbox") control.checked = false;
        else if (exempt.checked) control.value = "";
        control.disabled = exempt.checked;
      });
    };
    exempt.addEventListener("change", updateExemptFields);
    w4Form.addEventListener("reset", () => window.setTimeout(updateExemptFields, 0));
    updateExemptFields();
  }

  if (i9Form) {
    i9Form.querySelectorAll('input[name="status"]').forEach((radio) => radio.addEventListener("change", showI9StatusFields));
    i9Form.elements.namedItem("identifierType").addEventListener("change", showI9StatusFields);
    i9Form.addEventListener("reset", () => window.setTimeout(showI9StatusFields, 0));
    showI9StatusFields();
  }

  if (it4Form) {
    const field = (name) => it4Form.elements.namedItem(name);
    const updateTotal = () => {
      const first = Number(field("dependentExemption").value || 0);
      const second = Number(field("maritalExemption").value || 0);
      const dependents = Number(field("dependents").value || 0);
      field("totalExemptions").value = String(first + second + dependents);
    };
    ["dependentExemption", "maritalExemption", "dependents"].forEach((name) => field(name).addEventListener("input", updateTotal));
    it4Form.addEventListener("reset", () => window.setTimeout(updateTotal, 0));
    updateTotal();
  }

  if (onboardingForm && onboardingResponse) {
    onboardingForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!onboardingForm.reportValidity()) return;

      const files = ["w4Pdf", "i9Pdf", "it4Pdf"].map((name) => onboardingForm.elements.namedItem(name).files[0]);
      if (files.some((file) => !file || file.size > 10 * 1024 * 1024 || !/\.pdf$/i.test(file.name) || (file.type && file.type !== "application/pdf"))) {
        onboardingResponse.textContent = "Choose a signed PDF no larger than 10 MB for each required form.";
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
        const response = await fetch(onboardingForm.action, { method: "POST", body: new FormData(onboardingForm) });
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
})();
