let scriptPromise: Promise<void> | null = null;

export function loadRazorpay() {
  if (typeof window === "undefined") return Promise.reject(new Error("Checkout requires a browser."));
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => window.Razorpay ? resolve() : reject(new Error("Razorpay could not be initialized."));
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Secure checkout could not be loaded. Please try again."));
    };
    document.body.appendChild(script);
  });
  return scriptPromise;
}
