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
