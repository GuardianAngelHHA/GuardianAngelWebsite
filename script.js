const revealElements = document.querySelectorAll(".reveal");

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.15,
  }
);

revealElements.forEach((element) => {
  revealObserver.observe(element);
});

async function copyTextValue(value) {
  if (!navigator.clipboard || !value) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch (error) {
    return false;
  }
}

function getValue(formData, key) {
  return `${formData.get(key) || ""}`.trim();
}

function buildMailtoPayload({ recipient, subjectLine, bodyText, name }) {
  return {
    recipient,
    subjectLine,
    bodyText,
    name,
    mailto: `mailto:${recipient}?subject=${encodeURIComponent(subjectLine)}&body=${encodeURIComponent(bodyText)}`,
    copyText: `To: ${recipient}\nSubject: ${subjectLine}\n\n${bodyText}`,
  };
}

function buildContactInquiry(formElement) {
  const formData = new FormData(formElement);
  const name = getValue(formData, "name");
  const email = getValue(formData, "email");
  const service = getValue(formData, "service");
  const message = getValue(formData, "message");
  const recipient = formElement.dataset.recipient || "info@guardianangelcareohio.com";
  const subjectLine = `Guardian Angel inquiry - ${service || "General request"}`;
  const bodyText = `Name: ${name}\nEmail: ${email}\nInterested in: ${service}\n\nMessage:\n${message}`;

  return buildMailtoPayload({
    recipient,
    subjectLine,
    bodyText,
    name,
  });
}

function buildVaQuestionnaire(formElement) {
  const formData = new FormData(formElement);
  const name = getValue(formData, "name");
  const phone = getValue(formData, "phone");
  const email = getValue(formData, "email");
  const bestTimes = formData.getAll("bestTime").join(", ");
  const notes = getValue(formData, "notes");
  const recipient = formElement.dataset.recipient || "admin@GuardianAngelCareOhio.com";
  const subjectLine = `Guardian Angel VA Benefits Questionnaire${name ? ` - ${name}` : ""}`;

  const questions = [
    [
      "1. Are you a Veteran, living spouse, or surviving spouse of a Veteran over age 65?",
      getValue(formData, "va_q1"),
    ],
    [
      "2. Do you need some assistance at home with activities of daily living?",
      getValue(formData, "va_q2"),
    ],
    [
      "3. Do you have monthly household combined income from all sources below the guideline amounts?",
      getValue(formData, "va_q3"),
    ],
    [
      "4. Do you have less than $129,600 in retirement accounts, annuities, stocks, bonds, and cash in the bank?",
      getValue(formData, "va_q4"),
    ],
    [
      "5. Was the surviving spouse married to the Veteran at the time of the Veteran's death?",
      getValue(formData, "va_q5"),
    ],
    [
      "6. Did the Veteran serve at least 1 day of active duty during a wartime period?",
      getValue(formData, "va_q6"),
    ],
    [
      "7. Is the benefit applicant receiving monthly money from the VA, or have they applied for VA money or a pension benefit?",
      getValue(formData, "va_q7"),
    ],
    [
      "8. Is the applicant currently living at home and planning to stay there for at least a year, or returning home from a facility?",
      getValue(formData, "va_q8"),
    ],
  ];

  const questionText = questions
    .map(([question, answer]) => `${question}\nAnswer: ${answer || "Not answered"}`)
    .join("\n\n");

  const bodyText = `Name: ${name}\nPhone: ${phone}\nEmail: ${email}\nBest time to call: ${bestTimes || "Not provided"}\n\nVA Benefits Questionnaire:\n\n${questionText}${notes ? `\n\nAdditional notes:\n${notes}` : ""}`;

  return buildMailtoPayload({
    recipient,
    subjectLine,
    bodyText,
    name,
  });
}

function attachMailtoForm({
  formId,
  responseId,
  copyInquiryButtonId,
  copyEmailButtonId,
  buildInquiry,
}) {
  const formElement = document.getElementById(formId);
  const responseElement = document.getElementById(responseId);

  if (!formElement || !responseElement) {
    return;
  }

  const copyInquiryButton = document.getElementById(copyInquiryButtonId);
  const copyEmailButton = document.getElementById(copyEmailButtonId);

  formElement.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!formElement.reportValidity()) {
      return;
    }

    const inquiry = buildInquiry(formElement);
    const copied = await copyTextValue(inquiry.copyText);

    window.location.href = inquiry.mailto;

    if (copied) {
      responseElement.textContent = `Thanks${inquiry.name ? `, ${inquiry.name}` : ""}. If your device opens Chrome instead of an email app, your details have already been copied. Paste them into an email to ${inquiry.recipient}.`;
      return;
    }

    responseElement.textContent = `Thanks${inquiry.name ? `, ${inquiry.name}` : ""}. If Chrome opens instead of an email app, email ${inquiry.recipient} directly or use the copy buttons.`;
  });

  if (copyInquiryButton) {
    copyInquiryButton.addEventListener("click", async () => {
      const inquiry = buildInquiry(formElement);
      const copied = await copyTextValue(inquiry.copyText);

      responseElement.textContent = copied
        ? `Inquiry details copied. Paste them into an email to ${inquiry.recipient}.`
        : `Clipboard access was blocked. Please email ${inquiry.recipient} directly.`;
    });
  }

  if (copyEmailButton) {
    copyEmailButton.addEventListener("click", async () => {
      const recipient = formElement.dataset.recipient || "";
      const copied = await copyTextValue(recipient);

      responseElement.textContent = copied
        ? `Email address copied: ${recipient}`
        : `Clipboard access was blocked. The email address is ${recipient}.`;
    });
  }
}

function initVaWizard() {
  const formElement = document.getElementById("vaForm");
  const introCard = document.getElementById("vaIntroCard");
  const startButton = document.getElementById("vaStartButton");

  if (!formElement) {
    return;
  }

  const steps = Array.from(formElement.querySelectorAll(".va-step"));
  const prevButton = document.getElementById("vaPrevButton");
  const nextButton = document.getElementById("vaNextButton");
  const submitButton = document.getElementById("vaSubmitButton");
  const stepCount = document.getElementById("vaStepCount");
  const stepTitle = document.getElementById("vaStepTitle");
  const progressFill = document.getElementById("vaProgressFill");
  const responseElement = document.getElementById("vaFormResponse");

  if (!steps.length || !prevButton || !nextButton || !submitButton || !stepCount || !stepTitle || !progressFill) {
    return;
  }

  let currentStepIndex = 0;

  function showQuestionnaire() {
    if (introCard) {
      introCard.hidden = true;
    }

    formElement.hidden = false;

    if (startButton) {
      startButton.setAttribute("aria-expanded", "true");
    }

    updateStep();

    const firstControl = steps[currentStepIndex].querySelector("input, textarea, select");

    if (firstControl) {
      firstControl.focus({ preventScroll: true });
    }
  }

  function getStepRadioGroups(stepElement) {
    const radios = Array.from(stepElement.querySelectorAll('input[type="radio"][required]'));
    return [...new Set(radios.map((radio) => radio.name))];
  }

  function validateStep(stepElement) {
    const radioGroups = getStepRadioGroups(stepElement);

    for (const groupName of radioGroups) {
      const group = Array.from(stepElement.querySelectorAll(`input[name="${groupName}"]`));
      const hasSelection = group.some((radio) => radio.checked);

      if (!hasSelection) {
        if (responseElement) {
          responseElement.textContent = "Please answer the current question before continuing.";
        }

        if (group[0]) {
          group[0].focus();
        }

        return false;
      }
    }

    const fields = Array.from(
      stepElement.querySelectorAll('input:not([type="radio"]):not([type="checkbox"]), textarea, select')
    );

    for (const field of fields) {
      if (!field.reportValidity()) {
        return false;
      }
    }

    if (responseElement) {
      responseElement.textContent = "";
    }

    return true;
  }

  function updateStep() {
    const totalSteps = steps.length;
    const isFinalStep = currentStepIndex === totalSteps - 1;
    const currentStep = steps[currentStepIndex];

    steps.forEach((step, index) => {
      const isActive = index === currentStepIndex;
      step.hidden = !isActive;
      step.classList.toggle("is-active", isActive);
    });

    stepCount.textContent = `Question ${currentStepIndex + 1} of ${totalSteps}`;
    stepTitle.textContent = currentStep.dataset.stepTitle || "";
    progressFill.style.width = `${((currentStepIndex + 1) / totalSteps) * 100}%`;

    prevButton.hidden = currentStepIndex === 0;
    nextButton.hidden = isFinalStep;
    submitButton.hidden = !isFinalStep;

    if (!isFinalStep) {
      nextButton.textContent = currentStepIndex === totalSteps - 2 ? "Final Step" : "Next Question";
    }
  }

  prevButton.addEventListener("click", () => {
    if (currentStepIndex === 0) {
      return;
    }

    currentStepIndex -= 1;
    updateStep();
  });

  nextButton.addEventListener("click", () => {
    const currentStep = steps[currentStepIndex];

    if (!validateStep(currentStep)) {
      return;
    }

    if (currentStepIndex < steps.length - 1) {
      currentStepIndex += 1;
      updateStep();
    }
  });

  if (startButton) {
    startButton.addEventListener("click", showQuestionnaire);
  } else {
    showQuestionnaire();
  }

  if (formElement.hidden) {
    updateStep();
  }
}

function initFabMenus() {
  const fabLinks = document.querySelectorAll(".fab-link");

  fabLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const menu = link.closest(".fab-menu");

      if (menu) {
        menu.removeAttribute("open");
      }
    });
  });
}

attachMailtoForm({
  formId: "contactForm",
  responseId: "formResponse",
  copyInquiryButtonId: "copyInquiryButton",
  copyEmailButtonId: "copyEmailButton",
  buildInquiry: buildContactInquiry,
});

initVaWizard();
initFabMenus();

attachMailtoForm({
  formId: "vaForm",
  responseId: "vaFormResponse",
  buildInquiry: buildVaQuestionnaire,
});

function initEmploymentApplication() {
  const formElement = document.getElementById("employmentApplicationForm");

  if (!formElement) {
    return;
  }

  const applicationMain = document.querySelector(".application-main");
  const steps = Array.from(formElement.querySelectorAll(".application-step"));
  const prevButton = document.getElementById("applicationPrevButton");
  const nextButton = document.getElementById("applicationNextButton");
  const downloadButton = document.getElementById("applicationDownloadButton");
  const submitButton = document.getElementById("applicationSubmitButton");
  const refreshPreviewButton = document.getElementById("applicationRefreshPreviewButton");
  const responseElement = document.getElementById("applicationFormResponse");
  const stepCount = document.getElementById("applicationStepCount");
  const stepTitle = document.getElementById("applicationStepTitle");
  const progressFill = document.getElementById("applicationProgressFill");
  const summaryElement = document.getElementById("applicationSummary");
  const previewPages = document.getElementById("applicationPdfPreviewPages");
  const openPdfLink = document.getElementById("applicationOpenPdfLink");
  const dateField = formElement.elements.applicationDate;
  const signatureField = formElement.elements.applicantSignature;
  const fullNameField = formElement.elements.fullName;

  if (
    !steps.length ||
    !prevButton ||
    !nextButton ||
    !downloadButton ||
    !submitButton ||
    !responseElement ||
    !stepCount ||
    !stepTitle ||
    !progressFill ||
    !summaryElement ||
    !previewPages
  ) {
    return;
  }

  const pdfSourceUrl = "Forms/Guardian_Angel_Employment_Application.pdf";
  const submitEndpoint = (applicationMain?.dataset.applicationEndpoint || "").trim();
  const reviewSections = [
    {
      title: "Personal Information",
      step: 0,
      fields: [
        ["Full Name", "fullName"],
        ["Present Address", "presentAddress"],
        ["City/State/Zip", "cityStateZip"],
        ["Home Phone", "homePhone"],
        ["Mobile/Cell", "mobilePhone"],
        ["Social Security Number", "ssn", maskSensitiveValue],
        ["At least 18 years old", "atLeast18"],
      ],
    },
    {
      title: "Position Desired",
      step: 1,
      fields: [
        ["Position Applying For", "positionApplyingFor"],
        ["Salary Requirements", "salaryRequirements"],
        ["Employment Type", "employmentType", joinValues],
        ["Availability", "availability", joinValues],
        ["US Citizen", "usCitizen"],
        ["Legal right to remain in the US", "legalRight"],
        ["Adequate transportation", "transportation"],
      ],
    },
    {
      title: "Background Information",
      step: 2,
      fields: [
        ["Convicted or released from confinement in the last 7 years", "convicted"],
        ["Conviction details", "convictionDetails"],
        ["Presently charged with a violation of law", "presentlyCharged"],
        ["Charge details", "chargeDetails"],
      ],
    },
    {
      title: "Educational History",
      step: 3,
      fields: [
        ["High School", "highSchoolNameLocation"],
        ["High School Years", "highSchoolYears"],
        ["High School Graduated", "highSchoolGraduated"],
        ["High School Degree", "highSchoolDegree"],
        ["College", "collegeNameLocation"],
        ["College Years", "collegeYears"],
        ["College Graduated", "collegeGraduated"],
        ["College Degree", "collegeDegree"],
        ["Other School", "otherSchoolNameLocation"],
        ["Other School Years", "otherSchoolYears"],
        ["Other School Graduated", "otherSchoolGraduated"],
        ["Other School Degree", "otherSchoolDegree"],
      ],
    },
    {
      title: "Skills & Qualifications",
      step: 4,
      fields: [
        ["Professional Licenses", "professionalLicenses"],
        ["Other Skills", "otherSkills"],
        ["Languages Spoken", "languagesSpoken"],
        ["Professional Memberships/Honors", "membershipsHonors"],
      ],
    },
    {
      title: "Emergency Contact",
      step: 5,
      fields: [
        ["Primary Contact Name/Phone", "primaryContactNamePhone"],
        ["Primary Contact Relationship", "primaryContactRelationship"],
        ["Out of State Contact Name/Phone", "outStateContactNamePhone"],
        ["Out of State Contact Relationship", "outStateContactRelationship"],
      ],
    },
    {
      title: "Work History 1",
      step: 6,
      fields: [
        ["Employer Name", "work1EmployerName"],
        ["Phone", "work1Phone"],
        ["Address", "work1Address"],
        ["Job Title/Responsibilities", "work1Responsibilities"],
        ["Dates", "work1Dates"],
        ["Supervisor", "work1Supervisor"],
        ["May Contact", "work1MayContact"],
        ["Reason for Leaving", "work1ReasonLeaving"],
      ],
    },
    {
      title: "Work History 2",
      step: 7,
      fields: [
        ["Employer Name", "work2EmployerName"],
        ["Phone", "work2Phone"],
        ["Address", "work2Address"],
        ["Job Title/Responsibilities", "work2Responsibilities"],
        ["Dates", "work2Dates"],
        ["Supervisor", "work2Supervisor"],
        ["May Contact", "work2MayContact"],
        ["Reason for Leaving", "work2ReasonLeaving"],
      ],
    },
    {
      title: "Personal References",
      step: 8,
      fields: [
        ["Reference 1 Name", "reference1Name"],
        ["Reference 1 Phone", "reference1Phone"],
        ["Reference 1 Relationship", "reference1Relationship"],
        ["Reference 2 Name", "reference2Name"],
        ["Reference 2 Phone", "reference2Phone"],
        ["Reference 2 Relationship", "reference2Relationship"],
      ],
    },
    {
      title: "Applicant Statement",
      step: 9,
      fields: [
        ["Applicant Signature", "applicantSignature"],
        ["Date", "applicationDate"],
        ["Applicant Statement", "statementAgreement"],
      ],
    },
  ];

  let currentStepIndex = 0;
  let latestPdfBytes = null;
  let latestPreviewUrl = "";
  let latestPreviewRenderId = 0;

  if (dateField && !dateField.value) {
    dateField.value = new Date().toISOString().slice(0, 10);
  }

  function getFormData() {
    return new FormData(formElement);
  }

  function readAnswer(name) {
    return `${getFormData().get(name) || ""}`.trim();
  }

  function readAnswerList(name) {
    return getFormData()
      .getAll(name)
      .map((value) => `${value}`.trim())
      .filter(Boolean);
  }

  function joinValues(name) {
    return readAnswerList(name).join(", ");
  }

  function maskSensitiveValue(name) {
    const value = readAnswer(name).replace(/\D/g, "");

    if (value.length >= 4) {
      return `***-**-${value.slice(-4)}`;
    }

    return value ? "Provided" : "";
  }

  function setResponse(message) {
    responseElement.textContent = message || "";
  }

  function validateStep(stepElement) {
    const fields = Array.from(stepElement.querySelectorAll("input, textarea, select"));

    for (const field of fields) {
      if (!field.checkValidity()) {
        field.reportValidity();
        return false;
      }
    }

    return true;
  }

  function buildFileName() {
    const applicantName = readAnswer("fullName")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();

    return `${applicantName || "guardian-angel"}-employment-application.pdf`;
  }

  function showStep(nextIndex) {
    currentStepIndex = Math.max(0, Math.min(nextIndex, steps.length - 1));
    const isFinalStep = currentStepIndex === steps.length - 1;

    steps.forEach((step, index) => {
      const isActive = index === currentStepIndex;
      step.hidden = !isActive;
      step.classList.toggle("is-active", isActive);
    });

    stepCount.textContent = `Step ${currentStepIndex + 1} of ${steps.length}`;
    stepTitle.textContent = steps[currentStepIndex].dataset.stepTitle || "";
    progressFill.style.width = `${((currentStepIndex + 1) / steps.length) * 100}%`;
    prevButton.hidden = currentStepIndex === 0;
    nextButton.hidden = isFinalStep;
    downloadButton.hidden = !isFinalStep;
    submitButton.hidden = !isFinalStep;

    if (isFinalStep) {
      prepareReviewStep();
    }

    const firstControl = steps[currentStepIndex].querySelector("input, textarea, select, button");

    if (firstControl) {
      firstControl.focus({ preventScroll: true });
    }

    setResponse("");
  }

  function prepareReviewStep() {
    if (fullNameField && signatureField && !signatureField.value.trim()) {
      signatureField.value = fullNameField.value.trim();
    }

    renderApplicationSummary();
    updatePdfPreview();
  }

  function renderApplicationSummary() {
    summaryElement.innerHTML = reviewSections
      .map((section) => {
        const fields = section.fields
          .map(([label, name, formatter]) => {
            const value = formatter ? formatter(name) : readAnswer(name);
            const displayValue = value || "Not provided";

            return `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(displayValue)}</strong></div>`;
          })
          .join("");

        return `
          <article class="application-summary-card">
            <div class="application-summary-card-head">
              <h4>${escapeHtml(section.title)}</h4>
              <button class="button button-secondary button-small" type="button" data-application-edit-step="${section.step}">Edit</button>
            </div>
            <div class="application-summary-fields">${fields}</div>
          </article>
        `;
      })
      .join("");
  }

  function escapeHtml(value) {
    return `${value}`
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function wrapText(text, font, size, maxWidth) {
    const normalized = `${text || ""}`.replace(/\s+/g, " ").trim();

    if (!normalized) {
      return [];
    }

    const words = normalized.split(" ");
    const lines = [];
    let line = "";

    words.forEach((word) => {
      const testLine = line ? `${line} ${word}` : word;

      if (font.widthOfTextAtSize(testLine, size) <= maxWidth) {
        line = testLine;
        return;
      }

      if (line) {
        lines.push(line);
      }

      line = word;
    });

    if (line) {
      lines.push(line);
    }

    return lines;
  }

  async function generateApplicationPdf() {
    if (!window.PDFLib) {
      throw new Error("PDF tools did not load.");
    }

    const { PDFDocument, StandardFonts, rgb } = window.PDFLib;
    const existingPdfBytes = await fetch(pdfSourceUrl).then((response) => {
      if (!response.ok) {
        throw new Error("The blank application PDF could not be loaded.");
      }

      return response.arrayBuffer();
    });
    const pdfDocument = await PDFDocument.load(existingPdfBytes);
    const font = await pdfDocument.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDocument.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDocument.getPages();
    const ink = rgb(0.08, 0.1, 0.18);

    function pageAt(index) {
      return pages[index];
    }

    function yFromTop(page, top) {
      return page.getHeight() - top - 9;
    }

    function drawValue(pageIndex, x, top, value, options = {}) {
      const page = pageAt(pageIndex);
      const size = options.size || 8.5;
      const maxWidth = options.maxWidth || 180;
      const lineHeight = options.lineHeight || 10;
      const maxLines = options.maxLines || 1;
      const lines = wrapText(value, font, size, maxWidth).slice(0, maxLines);

      lines.forEach((line, index) => {
        page.drawText(line, {
          x,
          y: yFromTop(page, top + index * lineHeight),
          size,
          font,
          color: ink,
        });
      });
    }

    function drawMark(pageIndex, x, top, isChecked) {
      if (!isChecked) {
        return;
      }

      const page = pageAt(pageIndex);

      page.drawText("X", {
        x: x + 3.5,
        y: yFromTop(page, top),
        size: 9,
        font: boldFont,
        color: ink,
      });
    }

    function markYesNo(pageIndex, top, yesX, noX, value) {
      drawMark(pageIndex, yesX, top, value === "Yes" || value === "Y");
      drawMark(pageIndex, noX, top, value === "No" || value === "N");
    }

    drawValue(0, 118, 339, readAnswer("fullName"), { maxWidth: 390 });
    drawValue(0, 141, 352, readAnswer("presentAddress"), { maxWidth: 400 });
    drawValue(0, 128, 365, readAnswer("cityStateZip"), { maxWidth: 400 });
    drawValue(0, 136, 378, readAnswer("homePhone"), { maxWidth: 126 });
    drawValue(0, 342, 378, readAnswer("mobilePhone"), { maxWidth: 136 });
    drawValue(0, 191, 390, readAnswer("ssn"), { maxWidth: 104 });
    markYesNo(0, 390, 454.2, 487.4, readAnswer("atLeast18"));

    drawValue(0, 181, 443, readAnswer("positionApplyingFor"), { maxWidth: 150 });
    drawValue(0, 160, 456, readAnswer("salaryRequirements"), { maxWidth: 74 });
    drawMark(0, 88.9, 481, readAnswerList("employmentType").includes("Full Time"));
    drawMark(0, 88.9, 494, readAnswerList("employmentType").includes("Part Time"));
    drawMark(0, 88.9, 506, readAnswerList("employmentType").includes("Per Visit"));
    drawMark(0, 88.9, 519, readAnswerList("employmentType").includes("Pool"));
    drawMark(0, 88.9, 544, readAnswerList("availability").includes("Day"));
    drawMark(0, 88.9, 557, readAnswerList("availability").includes("Night"));
    drawMark(0, 88.9, 570, readAnswerList("availability").includes("Evening"));
    drawMark(0, 88.9, 583, readAnswerList("availability").includes("Weekend"));
    markYesNo(0, 594, 176.1, 209.3, readAnswer("usCitizen"));
    markYesNo(0, 607, 415.2, 448.4, readAnswer("legalRight"));
    markYesNo(0, 620, 485.1, 518.3, readAnswer("transportation"));
    markYesNo(0, 701, 301.3, 334.5, readAnswer("convicted"));
    drawValue(0, 91, 727, readAnswer("convictionDetails"), { maxWidth: 316, maxLines: 2 });

    markYesNo(1, 150, 451.6, 484.8, readAnswer("presentlyCharged"));
    drawValue(1, 91, 176, readAnswer("chargeDetails"), { maxWidth: 316, maxLines: 2 });
    drawEducationRow(307, "highSchool");
    drawEducationRow(344, "college");
    drawEducationRow(382, "otherSchool");
    drawValue(1, 60, 473, readAnswer("professionalLicenses"), { maxWidth: 516, maxLines: 2 });
    drawValue(1, 60, 511, readAnswer("otherSkills"), { maxWidth: 516, maxLines: 2 });
    drawValue(1, 273, 523, readAnswer("languagesSpoken"), { maxWidth: 265 });
    drawValue(1, 246, 536, readAnswer("membershipsHonors"), { maxWidth: 295 });
    drawValue(1, 218, 617, readAnswer("primaryContactNamePhone"), { maxWidth: 166 });
    drawValue(1, 456, 617, readAnswer("primaryContactRelationship"), { maxWidth: 80 });
    drawValue(1, 242, 630, readAnswer("outStateContactNamePhone"), { maxWidth: 165 });
    drawValue(1, 476, 630, readAnswer("outStateContactRelationship"), { maxWidth: 74 });
    drawValue(1, 130, 695, readAnswer("work1EmployerName"), { maxWidth: 152 });
    drawValue(1, 332, 695, readAnswer("work1Phone"), { maxWidth: 150 });
    drawValue(1, 108, 708, readAnswer("work1Address"), { maxWidth: 435 });
    drawValue(1, 197, 721, readAnswer("work1Responsibilities"), { maxWidth: 346, maxLines: 2 });

    drawValue(2, 151, 150, readAnswer("work1Dates"), { maxWidth: 146 });
    drawValue(2, 368, 150, readAnswer("work1Supervisor"), { maxWidth: 132 });
    markYesNo(2, 163, 149.9, 183.1, readAnswer("work1MayContact"));
    drawValue(2, 322, 163, readAnswer("work1ReasonLeaving"), { maxWidth: 130 });
    drawValue(2, 130, 176, readAnswer("work2EmployerName"), { maxWidth: 150 });
    drawValue(2, 332, 176, readAnswer("work2Phone"), { maxWidth: 150 });
    drawValue(2, 108, 188, readAnswer("work2Address"), { maxWidth: 435 });
    drawValue(2, 197, 201, readAnswer("work2Responsibilities"), { maxWidth: 346, maxLines: 2 });
    drawValue(2, 151, 213, readAnswer("work2Dates"), { maxWidth: 126 });
    drawValue(2, 344, 213, readAnswer("work2Supervisor"), { maxWidth: 130 });
    markYesNo(2, 226, 149.9, 183.1, readAnswer("work2MayContact"));
    drawValue(2, 322, 226, readAnswer("work2ReasonLeaving"), { maxWidth: 130 });
    drawValue(2, 97, 295, readAnswer("reference1Name"), { maxWidth: 156 });
    drawValue(2, 294, 295, readAnswer("reference1Phone"), { maxWidth: 136 });
    drawValue(2, 482, 295, readAnswer("reference1Relationship"), { maxWidth: 84 });
    drawValue(2, 97, 308, readAnswer("reference2Name"), { maxWidth: 156 });
    drawValue(2, 294, 308, readAnswer("reference2Phone"), { maxWidth: 136 });
    drawValue(2, 482, 308, readAnswer("reference2Relationship"), { maxWidth: 84 });
    drawValue(2, 145, 478, readAnswer("applicantSignature"), { maxWidth: 245 });
    drawValue(2, 416, 478, formatDateForPdf(readAnswer("applicationDate")), { maxWidth: 108 });

    return pdfDocument.save();

    function drawEducationRow(top, prefix) {
      drawValue(1, 126, top, readAnswer(`${prefix}NameLocation`), { maxWidth: 88, maxLines: 2 });
      drawValue(1, 222, top, readAnswer(`${prefix}Years`), { maxWidth: 82 });
      drawMark(1, 316.1, top, readAnswer(`${prefix}Graduated`) === "Y");
      drawMark(1, 338.7, top, readAnswer(`${prefix}Graduated`) === "N");
      drawValue(1, 408, top, readAnswer(`${prefix}Degree`), { maxWidth: 126, maxLines: 2 });
    }
  }

  function formatDateForPdf(value) {
    if (!value) {
      return "";
    }

    const [year, month, day] = value.split("-");

    if (!year || !month || !day) {
      return value;
    }

    return `${month}/${day}/${year}`;
  }

  async function updatePdfPreview() {
    try {
      setResponse("Generating completed PDF preview...");
      latestPdfBytes = await generateApplicationPdf();
      const pdfBlob = new Blob([latestPdfBytes], { type: "application/pdf" });

      if (latestPreviewUrl) {
        URL.revokeObjectURL(latestPreviewUrl);
      }

      latestPreviewUrl = URL.createObjectURL(pdfBlob);

      if (openPdfLink) {
        openPdfLink.href = latestPreviewUrl;
        openPdfLink.hidden = false;
      }

      await renderPdfPreviewPages(latestPdfBytes);
      setResponse("Preview updated.");
    } catch (error) {
      latestPdfBytes = null;
      previewPages.innerHTML = '<div class="application-preview-empty">The completed PDF preview could not be shown. Use Open PDF or Download PDF to view the completed application.</div>';
      setResponse("The completed PDF could not be generated. Please refresh and try again.");
    }
  }

  async function renderPdfPreviewPages(pdfBytes) {
    const renderId = ++latestPreviewRenderId;

    previewPages.innerHTML = '<div class="application-preview-empty">Rendering completed PDF preview...</div>';

    if (!window.pdfjsLib) {
      previewPages.innerHTML = '<div class="application-preview-empty">Preview rendering tools did not load. Use Open PDF or Download PDF to view the completed application.</div>';
      return;
    }

    const pdfjsLib = window.pdfjsLib;

    if (pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = "assets/vendor/pdf.worker.min.js";
    }

    const pdfData = new Uint8Array(pdfBytes);
    const pdfDocument = await pdfjsLib.getDocument({ data: pdfData }).promise;
    const fragment = document.createDocumentFragment();

    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
      if (renderId !== latestPreviewRenderId) {
        return;
      }

      const page = await pdfDocument.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const availableWidth = Math.max(280, Math.min(previewPages.clientWidth || 760, 840) - 32);
      const scale = Math.min(1.35, availableWidth / baseViewport.width);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      const pageShell = document.createElement("figure");
      const caption = document.createElement("figcaption");
      const context = canvas.getContext("2d");

      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      canvas.style.width = "100%";
      canvas.style.height = "auto";
      canvas.setAttribute("aria-label", `Completed employment application page ${pageNumber}`);

      if (!context) {
        continue;
      }

      await page.render({ canvasContext: context, viewport }).promise;

      pageShell.className = "application-pdf-page";
      caption.textContent = `Page ${pageNumber} of ${pdfDocument.numPages}`;
      pageShell.append(canvas, caption);
      fragment.append(pageShell);
    }

    if (renderId === latestPreviewRenderId) {
      previewPages.innerHTML = "";
      previewPages.append(fragment);
    }
  }

  async function ensureLatestPdf() {
    if (!latestPdfBytes) {
      latestPdfBytes = await generateApplicationPdf();
    }

    return latestPdfBytes;
  }

  function downloadPdf(pdfBytes, fileName) {
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function submitApplication(pdfBytes, fileName) {
    if (!submitEndpoint) {
      throw new Error("Secure submission is not available. Please contact Guardian Angel for a secure return method.");
    }

    const formData = new FormData();
    formData.append("applicationPdf", new File([pdfBytes], fileName, { type: "application/pdf" }));

    const response = await fetch(submitEndpoint, { method: "POST", body: formData });
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw new Error("The secure submission service is unavailable. Please contact Guardian Angel for a secure return method.");
    }

    const payload = await response.json();
    if (!response.ok || payload.ok !== true) {
      throw new Error(payload.message || "The secure submission could not be completed.");
    }

    return payload;
  }

  prevButton.addEventListener("click", () => {
    showStep(currentStepIndex - 1);
  });

  nextButton.addEventListener("click", () => {
    const currentStep = steps[currentStepIndex];

    if (!validateStep(currentStep)) {
      return;
    }

    latestPdfBytes = null;
    showStep(currentStepIndex + 1);
  });

  if (refreshPreviewButton) {
    refreshPreviewButton.addEventListener("click", async () => {
      if (!validateStep(steps[currentStepIndex])) {
        return;
      }

      renderApplicationSummary();
      latestPdfBytes = null;
      await updatePdfPreview();
    });
  }

  summaryElement.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-application-edit-step]");

    if (!editButton) {
      return;
    }

    const nextStep = Number(editButton.dataset.applicationEditStep);

    if (Number.isFinite(nextStep)) {
      showStep(nextStep);
    }
  });

  function handleApplicationInputChange() {
    latestPdfBytes = null;

    if (currentStepIndex === steps.length - 1) {
      renderApplicationSummary();
    }
  }

  formElement.addEventListener("input", handleApplicationInputChange);
  formElement.addEventListener("change", handleApplicationInputChange);

  downloadButton.addEventListener("click", async () => {
    if (!validateStep(steps[currentStepIndex])) {
      return;
    }

    try {
      setResponse("Preparing your PDF download...");
      const pdfBytes = await ensureLatestPdf();
      downloadPdf(pdfBytes, buildFileName());
      setResponse("Completed application PDF downloaded.");
    } catch (error) {
      setResponse("The completed PDF could not be downloaded. Please refresh and try again.");
    }
  });

  submitButton.addEventListener("click", async () => {
    if (!validateStep(steps[currentStepIndex])) {
      return;
    }

    submitButton.disabled = true;
    try {
      setResponse("Preparing application submission...");
      const pdfBytes = await ensureLatestPdf();
      const fileName = buildFileName();

      downloadPdf(pdfBytes, fileName);
      const result = await submitApplication(pdfBytes, fileName);
      setResponse(result.notificationSent
        ? `Your application was received. Reference: ${result.reference}.`
        : `Your application was stored. Reference: ${result.reference}. Please call Guardian Angel to let the office know the application is ready.`);
    } catch (error) {
      setResponse(`Your application PDF was downloaded, but secure submission failed. Keep the PDF and contact Guardian Angel for a secure return method. ${error.message || ""}`.trim());
    } finally {
      submitButton.disabled = false;
    }
  });

  showStep(0);
}

initEmploymentApplication();
