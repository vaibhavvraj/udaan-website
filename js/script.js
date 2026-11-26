function copyUPI() {
    const upiElement = document.getElementById("upi-id");
    const copyButton = document.querySelector(".copy-btn");

    if (!upiElement || !copyButton) return;

    const copyText = navigator.clipboard && window.isSecureContext
        ? navigator.clipboard.writeText(upiElement.innerText)
        : Promise.reject();

    copyText.then(() => {
        const originalLabel = copyButton.getAttribute("aria-label");
        copyButton.setAttribute("aria-label", "UPI ID copied");
        copyButton.classList.add("is-copied");
        window.setTimeout(() => {
            copyButton.setAttribute("aria-label", originalLabel || "Copy UPI ID");
            copyButton.classList.remove("is-copied");
        }, 1800);
    }).catch(() => window.prompt("Copy this UPI ID:", upiElement.innerText));
}

const navToggle = document.querySelector(".nav-toggle");
const primaryNavigation = document.querySelector("#primary-navigation");

if (navToggle && primaryNavigation) {
    navToggle.addEventListener("click", () => {
        const isOpen = primaryNavigation.classList.toggle("is-open");
        navToggle.classList.toggle("is-open", isOpen);
        navToggle.setAttribute("aria-expanded", String(isOpen));
        navToggle.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
    });

    primaryNavigation.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => {
            primaryNavigation.classList.remove("is-open");
            navToggle.classList.remove("is-open");
            navToggle.setAttribute("aria-expanded", "false");
            navToggle.setAttribute("aria-label", "Open navigation menu");
        });
    });
}

const scrollProgressBar = document.querySelector(".scroll-progress-bar");

if (scrollProgressBar) {
    const updateScrollProgress = () => {
        const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0;
        scrollProgressBar.style.transform = `scaleX(${Math.min(Math.max(progress, 0), 1)})`;
    };

    updateScrollProgress();
    window.addEventListener("scroll", updateScrollProgress, { passive: true });
    window.addEventListener("resize", updateScrollProgress);
}

// Page Preloader dismissal
(function () {
    const preloader = document.getElementById("preloader");
    if (!preloader) return;

    let isDismissed = false;
    const hidePreloader = () => {
        if (isDismissed) return;
        isDismissed = true;
        preloader.classList.add("preloader-hidden");
        window.setTimeout(() => {
            if (preloader.parentNode) {
                preloader.style.display = "none";
            }
        }, 450);
    };

    const minDisplayMs = 250;
    const startTime = Date.now();

    const onReady = () => {
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, minDisplayMs - elapsed);
        window.setTimeout(hidePreloader, delay);
    };

    if (document.readyState === "complete") {
        onReady();
    } else {
        window.addEventListener("load", onReady);
    }

    // Safety timeout: dismiss after 2s max to prevent blocking
    window.setTimeout(hidePreloader, 2000);
})();

// Dynamic UPI Donation Form & QR Controller
(function () {
    const donationForm = document.getElementById("donation-form");
    if (!donationForm) return;

    const UPI_ID = "ar4041148-1@oksbi";
    const PAYEE_NAME = "Udaan";
    const WEB3FORMS_URL = "https://api.web3forms.com/submit";
    const accessKeyInput = donationForm.querySelector('input[name="access_key"]');

    const nameInput = document.getElementById("donor-name");
    const emailInput = document.getElementById("donor-email");
    const phoneInput = document.getElementById("donor-phone");
    const amountInput = document.getElementById("donor-amount");
    const presetChips = Array.from(document.querySelectorAll(".amount-chip"));
    const payBtn = document.getElementById("pay-now-btn");
    const payBtnLabel = document.getElementById("pay-btn-label");
    const qrPlaceholder = document.getElementById("qr-placeholder");
    const qrPanel = document.getElementById("dynamic-qr-panel");
    const qrFrame = document.getElementById("dynamic-qr-frame");
    const qrAmountDisplay = document.getElementById("qr-amount-display");
    const consentInput = document.getElementById("donor-consent");
    const consentBox = document.getElementById("consent-box");
    const readNoticeLink = document.getElementById("read-notice-link");
    const noticeSection = document.getElementById("transparency-notice");
    const statusEl = document.getElementById("donation-status");

    const phonePortraitMQ = window.matchMedia("(max-width: 600px)");
    const phoneLandscapeMQ = window.matchMedia(
        "(pointer: coarse) and (max-height: 500px) and (max-width: 920px)"
    );
    const isPhoneDevice = () => phonePortraitMQ.matches || phoneLandscapeMQ.matches;

    const generateRefId = () => {
        const timePart = String(Date.now()).slice(-4);
        const randPart = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `UDN-${timePart}${randPart}`;
    };

    const sanitizeNote = (text) =>
        String(text || "")
            .replace(/[^a-zA-Z0-9 ._-]/g, "")
            .trim()
            .slice(0, 30);

    let currentRefId = generateRefId();
    let lastSubmittedKey = "";

    const getParsedAmount = () => {
        const raw = Number(amountInput ? amountInput.value : 0);
        if (!Number.isFinite(raw) || raw < 1) return 0;
        return Math.round(raw);
    };

    const formatInr = (amount) => `₹${amount.toLocaleString("en-IN")}`;

    const buildUpiUrl = (amount, donorName, refId) => {
        const cleanName = sanitizeNote(donorName);
        const note = cleanName ? `${refId} ${cleanName}` : `Udaan Donation ${refId}`;
        const params = [
            `pa=${UPI_ID}`,
            `pn=${encodeURIComponent(PAYEE_NAME)}`,
            `cu=INR`,
        ];
        if (amount >= 1) {
            params.push(`am=${encodeURIComponent(String(amount))}`);
        }
        params.push(`tn=${encodeURIComponent(note)}`);
        return `upi://pay?${params.join("&")}`;
    };

    const renderDynamicQR = (upiUrl, amount) => {
        if (!qrFrame || typeof window.qrcode !== "function") return;
        try {
            const qr = window.qrcode(0, "M");
            qr.addData(upiUrl);
            qr.make();
            qrFrame.innerHTML = qr.createSvgTag({ scalable: true, margin: 2 });
            const svg = qrFrame.querySelector("svg");
            if (svg) {
                svg.setAttribute("role", "img");
                svg.setAttribute(
                    "aria-label",
                    amount >= 1 ? `Dynamic UPI QR code for ${formatInr(amount)}` : "Udaan UPI QR code"
                );
                svg.querySelectorAll("path, rect").forEach((node) => {
                    const fill = (node.getAttribute("fill") || "").toLowerCase();
                    if (fill && fill !== "#ffffff" && fill !== "white") {
                        node.setAttribute("fill", "#0C1E40");
                    }
                });
            }
        } catch (_err) {
            // Keep static fallback image inside .qr-frame on unexpected QR error
        }
    };

    const hideGeneratedQR = () => {
        if (qrPanel) qrPanel.hidden = true;
        if (qrPlaceholder) qrPlaceholder.hidden = false;
        if (qrFrame) qrFrame.classList.remove("is-highlighted");
    };

    const showGeneratedQR = (upiUrl, amount) => {
        renderDynamicQR(upiUrl, amount);
        if (qrAmountDisplay) {
            qrAmountDisplay.textContent = formatInr(amount);
        }
        if (qrPlaceholder) qrPlaceholder.hidden = true;
        if (qrPanel) qrPanel.hidden = false;
        if (qrFrame) qrFrame.classList.add("is-highlighted");
    };

    const syncDynamicUI = () => {
        const amount = getParsedAmount();
        const isPhone = isPhoneDevice();

        presetChips.forEach((chip) => {
            const chipVal = Number(chip.getAttribute("data-amount"));
            chip.classList.toggle("is-active", amount > 0 && chipVal === amount);
        });

        if (payBtnLabel) {
            if (isPhone) {
                payBtnLabel.textContent = amount >= 1
                    ? `Pay ${formatInr(amount)} via UPI App`
                    : "Pay via UPI App";
            } else {
                payBtnLabel.textContent = amount >= 1
                    ? `Generate ${formatInr(amount)} Payment QR`
                    : "Generate Payment QR";
            }
        }

        if (qrAmountDisplay) {
            qrAmountDisplay.textContent = amount >= 1 ? formatInr(amount) : "Any amount";
        }
    };

    const setStatus = (message, isError = false) => {
        if (!statusEl) return;
        statusEl.textContent = message;
        statusEl.classList.toggle("is-error", isError);
        statusEl.hidden = false;
    };

    const clearInvalidStates = () => {
        [nameInput, emailInput, phoneInput, amountInput].forEach((input) => {
            if (input) input.classList.remove("is-invalid");
        });
        if (consentBox) consentBox.classList.remove("is-invalid");
    };

    const markInvalid = (input, message) => {
        if (input) {
            input.classList.add("is-invalid");
            input.focus();
        }
        setStatus(message, true);
    };

    if (readNoticeLink && noticeSection) {
        readNoticeLink.addEventListener("click", (event) => {
            event.preventDefault();
            noticeSection.scrollIntoView({ behavior: "smooth", block: "center" });
            noticeSection.classList.add("is-highlighted");
            window.setTimeout(() => {
                noticeSection.classList.remove("is-highlighted");
            }, 1600);
        });
    }

    if (consentInput) {
        consentInput.addEventListener("change", () => {
            if (consentBox) consentBox.classList.remove("is-invalid");
            lastSubmittedKey = "";
        });
    }

    presetChips.forEach((chip) => {
        chip.addEventListener("click", () => {
            const val = chip.getAttribute("data-amount");
            if (amountInput && val) {
                amountInput.value = val;
                amountInput.classList.remove("is-invalid");
            }
            lastSubmittedKey = "";
            currentRefId = generateRefId();
            hideGeneratedQR();
            syncDynamicUI();
        });
    });

    [nameInput, emailInput, phoneInput, amountInput].forEach((input) => {
        if (!input) return;
        input.addEventListener("input", () => {
            input.classList.remove("is-invalid");
            lastSubmittedKey = "";
            if (qrPanel && !qrPanel.hidden) {
                hideGeneratedQR();
            }
            if (input === amountInput || input === nameInput) {
                currentRefId = generateRefId();
                syncDynamicUI();
            }
        });
    });

    [phonePortraitMQ, phoneLandscapeMQ].forEach((mq) => {
        if (mq && typeof mq.addEventListener === "function") {
            mq.addEventListener("change", syncDynamicUI);
        }
    });

    const launchUpiLink = (upiUrl) => {
        const tempLink = document.createElement("a");
        tempLink.href = upiUrl;
        tempLink.style.display = "none";
        document.body.appendChild(tempLink);
        tempLink.click();
        document.body.removeChild(tempLink);
    };

    donationForm.addEventListener("submit", (event) => {
        event.preventDefault();
        clearInvalidStates();

        const name = (nameInput ? nameInput.value : "").trim();
        const email = (emailInput ? emailInput.value : "").trim();
        const phone = (phoneInput ? phoneInput.value : "").trim();
        const phoneDigits = phone.replace(/\D/g, "");
        const amount = getParsedAmount();
        const isPhone = isPhoneDevice();

        if (!name) {
            markInvalid(nameInput, "Please enter your name before proceeding.");
            return;
        }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            markInvalid(emailInput, "Please enter a valid email address or leave it blank.");
            return;
        }
        if (phoneDigits.length < 10) {
            markInvalid(phoneInput, "Please enter a valid phone number (at least 10 digits).");
            return;
        }
        if (amount < 1) {
            markInvalid(amountInput, "Please choose or enter a donation amount of at least ₹1.");
            return;
        }
        if (consentInput && !consentInput.checked) {
            if (consentBox) consentBox.classList.add("is-invalid");
            if (consentInput) consentInput.focus();
            setStatus("Please confirm that you have read the Transparency & Contribution Notice.", true);
            return;
        }

        const submissionKey = `${name}|${email}|${phoneDigits}|${amount}|${currentRefId}`;
        const upiUrl = buildUpiUrl(amount, name, currentRefId);
        const formattedAmount = formatInr(amount);

        // On PC & Tablets: reveal the custom generated QR only after clicking the button
        if (!isPhone) {
            showGeneratedQR(upiUrl, amount);
        }

        // Send contributor record to official Udaan email on both Phone and PC/Tablet
        if (submissionKey !== lastSubmittedKey) {
            lastSubmittedKey = submissionKey;

            const accessKey = accessKeyInput ? accessKeyInput.value.trim() : "";
            const payload = {
                access_key: accessKey,
                subject: `Donation Initiated: ${formattedAmount} by ${name} (${currentRefId})`,
                from_name: "Udaan Donation Page",
                name,
                phone,
                amount_inr: formattedAmount,
                reference_id: currentRefId,
                upi_id: UPI_ID,
                upi_note: `${currentRefId} ${sanitizeNote(name)}`.trim(),
                payment_mode: isPhone ? "Mobile UPI App" : "Desktop/Tablet QR",
                notice_acknowledged: "Yes — Donor confirmed reading the Transparency & Contribution Notice",
            };
            if (email) {
                payload.email = email;
            }

            if (payBtn) payBtn.disabled = true;
            setStatus(
                isPhone
                    ? `Opening your UPI app to complete your ${formattedAmount} donation…`
                    : `Scan the QR code with any UPI app to complete your ${formattedAmount} donation.`
            );

            fetch(WEB3FORMS_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify(payload),
                keepalive: true,
            })
                .then((res) => {
                    if (!res.ok) throw new Error("Submission failed");
                    setStatus(
                        isPhone
                            ? `Complete your ${formattedAmount} payment in your UPI app.`
                            : `Scan the QR code with any UPI app to complete your ${formattedAmount} donation.`
                    );
                })
                .catch(() => {
                    lastSubmittedKey = "";
                    setStatus(
                        isPhone
                            ? `Complete your ${formattedAmount} payment in your UPI app.`
                            : `Scan the QR code with any UPI app to complete your ${formattedAmount} donation.`
                    );
                })
                .finally(() => {
                    if (payBtn) payBtn.disabled = false;
                });
        } else {
            setStatus(
                isPhone
                    ? `Complete your ${formattedAmount} payment in your UPI app.`
                    : `Scan the QR code with any UPI app to complete your ${formattedAmount} donation.`
            );
        }

        // Only open UPI app directly on Phones (never on PCs or Tablets)
        if (isPhone) {
            launchUpiLink(upiUrl);
        }
    });

    hideGeneratedQR();
    syncDynamicUI();
})();

// Home Page Enquiries / Contact Form (No Redirect + Custom Web3Forms Metadata)
(function () {
    const contactForm = document.getElementById("contact-form");
    if (!contactForm) return;

    const WEB3FORMS_URL = "https://api.web3forms.com/submit";
    const accessKeyInput = contactForm.querySelector('input[name="access_key"]');
    const nameInput = document.getElementById("name");
    const emailInput = document.getElementById("email");
    const helpSelect = document.getElementById("help");
    const messageInput = document.getElementById("message");
    const submitBtn = document.getElementById("contact-submit-btn");
    const btnLabel = document.getElementById("contact-btn-label");
    const statusEl = document.getElementById("contact-status");

    const setStatus = (message, isError = false) => {
        if (!statusEl) return;
        statusEl.textContent = message;
        statusEl.classList.toggle("is-error", isError);
        statusEl.hidden = false;
    };

    const clearInvalid = () => {
        [nameInput, emailInput, messageInput].forEach((el) => {
            if (el) el.classList.remove("is-invalid");
        });
    };

    [nameInput, emailInput, messageInput].forEach((el) => {
        if (!el) return;
        el.addEventListener("input", () => {
            el.classList.remove("is-invalid");
        });
    });

    contactForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearInvalid();

        const name = (nameInput ? nameInput.value : "").trim();
        const email = (emailInput ? emailInput.value : "").trim();
        const message = (messageInput ? messageInput.value : "").trim();
        const selectedOption = helpSelect && helpSelect.options[helpSelect.selectedIndex];
        const helpLabel = selectedOption ? selectedOption.textContent.trim() : "General Enquiry";

        if (!name) {
            if (nameInput) {
                nameInput.classList.add("is-invalid");
                nameInput.focus();
            }
            setStatus("Please enter your name before sending.", true);
            return;
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            if (emailInput) {
                emailInput.classList.add("is-invalid");
                emailInput.focus();
            }
            setStatus("Please enter a valid email address.", true);
            return;
        }

        const accessKey = accessKeyInput ? accessKeyInput.value.trim() : "";
        const payload = {
            access_key: accessKey,
            from_name: "Udaan Website Enquiries",
            subject: `New Enquiry (${helpLabel}) from ${name}`,
            name,
            email,
            help_topic: helpLabel,
            message: message || "(No message provided)",
        };

        if (submitBtn) submitBtn.disabled = true;
        if (btnLabel) btnLabel.textContent = "Sending...";
        setStatus("Sending your enquiry…");

        try {
            const res = await fetch(WEB3FORMS_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.success === false) {
                throw new Error("Submission failed");
            }
            contactForm.reset();
            setStatus("Thank you! Your enquiry has been sent. Our team will get back to you soon.");
        } catch (_err) {
            setStatus(
                "Could not send right now. Please try again or email team.udaan.fly@gmail.com.",
                true
            );
        } finally {
            if (submitBtn) submitBtn.disabled = false;
            if (btnLabel) btnLabel.textContent = "Send message";
        }
    });
})();
