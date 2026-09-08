(function () {
  "use strict";

  // ---------------------------------------------------
  // Segment metadata (icons + descriptions), keyed by cluster.
  // The segment NAME shown to the user always comes from the API response,
  // never from this map — this only drives description text and styling.
  // ---------------------------------------------------
  const SEGMENT_INFO = {
    0: {
      description: "Customers with relatively lower purchasing value.",
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><circle cx="12" cy="12" r="8.5" opacity="0.35"/></svg>',
    },
    1: {
      description: "Customers with strong purchasing value and good engagement.",
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3L20 12L12 21L4 12Z"/></svg>',
    },
    2: {
      description: "Customers who show consistent purchasing behavior and loyalty.",
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3L19 6V11C19 15.4 16 19 12 21C8 19 5 15.4 5 11V6L12 3Z"/></svg>',
    },
    3: {
      description: "Customers who are more responsive to discounts and deals.",
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12L12 20L4 12V6C4 4.9 4.9 4 6 4H12L20 12Z"/><circle cx="8.5" cy="8.5" r="1.4" fill="currentColor" stroke="none"/></svg>',
    },
    4: {
      description: "High-value customers with strong purchasing activity.",
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3L14.6 9.2L21.3 9.8L16.2 14.1L17.8 20.7L12 17.1L6.2 20.7L7.8 14.1L2.7 9.8L9.4 9.2Z"/></svg>',
    },
  };

  // Field configuration: input id -> API key + validation rule.
  const FIELDS = [
    { id: "total-orders", key: "Total_Orders", min: 0 },
    { id: "avg-order-value", key: "Avg_Order_Value", min: 0 },
    { id: "total-quantity", key: "Total_Quantity", min: 0 },
    { id: "recency", key: "Recency", min: 0 },
    { id: "total-spending", key: "Total_Spending", min: 0 },
    { id: "avg-discount", key: "Avg_Discount", min: 0, max: 100 },
  ];

  const form = document.getElementById("predict-form");
  const predictBtn = document.getElementById("predict-btn");
  const resetBtn = document.getElementById("reset-btn");
  const formError = document.getElementById("form-error");

  const resultEmpty = document.getElementById("result-empty");
  const resultCard = document.getElementById("result-card");
  const resultIcon = document.getElementById("result-icon");
  const resultSegment = document.getElementById("result-segment");
  const resultClusterNumber = document.getElementById("result-cluster-number");
  const resultDescription = document.getElementById("result-description");

  function clearFieldError(field) {
    const input = document.getElementById(field.id);
    const errorEl = document.getElementById(field.id + "-error");
    input.classList.remove("invalid");
    if (errorEl) errorEl.textContent = "";
  }

  function setFieldError(field, message) {
    const input = document.getElementById(field.id);
    const errorEl = document.getElementById(field.id + "-error");
    input.classList.add("invalid");
    if (errorEl) errorEl.textContent = message;
  }

  function hideFormError() {
    formError.hidden = true;
    formError.textContent = "";
  }

  function showFormError(message) {
    formError.textContent = message;
    formError.hidden = false;
  }

  // Reads and validates every field. Returns { data, isValid }.
  function collectFormData() {
    let isValid = true;
    const data = {};

    FIELDS.forEach((field) => {
      const input = document.getElementById(field.id);
      const rawValue = input.value.trim();
      clearFieldError(field);

      if (rawValue === "") {
        setFieldError(field, "Required.");
        isValid = false;
        return;
      }

      const numericValue = Number(rawValue);

      if (!Number.isFinite(numericValue)) {
        setFieldError(field, "Enter a valid number.");
        isValid = false;
        return;
      }

      if (typeof field.min === "number" && numericValue < field.min) {
        setFieldError(field, `Must be ${field.min} or more.`);
        isValid = false;
        return;
      }

      if (typeof field.max === "number" && numericValue > field.max) {
        setFieldError(field, `Must be ${field.max} or less.`);
        isValid = false;
        return;
      }

      data[field.key] = numericValue;
    });

    return { data, isValid };
  }

  function setLoading(isLoading) {
    predictBtn.disabled = isLoading;
    resetBtn.disabled = isLoading;
    predictBtn.classList.toggle("is-loading", isLoading);
  }

  function showResult(prediction) {
    const cluster = prediction.cluster;
    const segmentName = prediction.segment;
    const info = SEGMENT_INFO[cluster];

    resultCard.dataset.cluster = String(cluster);
    resultIcon.innerHTML = info ? info.icon : "";
    resultSegment.textContent = segmentName;
    resultClusterNumber.textContent = String(cluster);
    resultDescription.textContent = info ? info.description : "";

    resultEmpty.hidden = true;
    resultCard.hidden = false;
  }

  function resetResult() {
    resultCard.hidden = true;
    resultCard.dataset.cluster = "";
    resultEmpty.hidden = false;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    hideFormError();

    const { data, isValid } = collectFormData();
    if (!isValid) {
      showFormError("Check the highlighted fields and try again.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Request failed with status " + response.status);
      }

      const prediction = await response.json();

      if (
        typeof prediction.cluster === "undefined" ||
        typeof prediction.segment === "undefined"
      ) {
        throw new Error("Unexpected response shape.");
      }

      showResult(prediction);
    } catch (error) {
      showFormError(
        "We couldn't get a prediction right now. Please try again in a moment."
      );
      resetResult();
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    form.reset();
    hideFormError();
    FIELDS.forEach(clearFieldError);
    resetResult();
  }

  form.addEventListener("submit", handleSubmit);
  resetBtn.addEventListener("click", handleReset);
})();