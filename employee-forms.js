(() => {
  const form = document.getElementById("it4Form");
  const printButton = document.getElementById("printIt4");
  const year = document.getElementById("currentYear");

  if (year) year.textContent = String(new Date().getFullYear());
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
