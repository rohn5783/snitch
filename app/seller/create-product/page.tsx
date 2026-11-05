"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PageHeading } from "@/components/page-heading";
import { useProtectedRoute } from "@/hooks/use-protected-route";
import { api } from "@/lib/api";

const maximumImages = 7;

export default function CreateProductPage() {
  const { ready } = useProtectedRoute("seller");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceAmount, setPriceAmount] = useState("");
  const [priceCurrency, setPriceCurrency] = useState("INR");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function chooseFiles(files: FileList | null) {
    if (!files) return;
    const newImages = [...images, ...Array.from(files)].slice(0, maximumImages);
    previews.forEach((url) => URL.revokeObjectURL(url));
    setImages(newImages);
    setPreviews(newImages.map((file) => URL.createObjectURL(file)));
  }

  function removeImage(index: number) {
    URL.revokeObjectURL(previews[index]);
    setImages((current) => current.filter((_, position) => position !== index));
    setPreviews((current) => current.filter((_, position) => position !== index));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!images.length) {
      setError("Choose at least one product photograph.");
      return;
    }
    if (images.some((image) => image.size > 5 * 1024 * 1024)) {
      setError("Each image must be smaller than 5 MB.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = new FormData();
      data.append("title", title.trim());
      data.append("description", description.trim());
      data.append("priceAmount", priceAmount);
      data.append("priceCurrency", priceCurrency);
      images.forEach((image) => data.append("images", image));
      await api("/products", { method: "POST", body: data });
      router.push("/seller/dashboard");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your listing could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <div className="center-state"><span className="loading-mark" /></div>;
  return (
    <div className="account-page page-gutter seller-form-page">
      <PageHeading label="YOUR STUDIO / NEW LISTING" title="Put it out there." description="A good listing starts with the details that matter." backHref="/seller/dashboard" />
      <form className="editor-form" onSubmit={submit}>
        <div className="editor-form__fields">
          <label>THE NAME<input value={title} onChange={(event) => setTitle(event.target.value)} minLength={2} maxLength={120} required placeholder="A name worth remembering" /></label>
          <label>THE STORY<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={5} maxLength={3000} required placeholder="What makes this piece feel different?" /></label>
          <div className="editor-form__price"><label>THE PRICE<input type="number" value={priceAmount} onChange={(event) => setPriceAmount(event.target.value)} min="1" step="1" required placeholder="0" /></label><label>IN<select value={priceCurrency} onChange={(event) => setPriceCurrency(event.target.value)}>{["INR", "USD", "EUR", "GBP"].map((currency) => <option key={currency}>{currency}</option>)}</select></label></div>
          <p className="form-hint">The price shown is the starting price. Add sizes, colours and inventory from your studio after creating the listing.</p>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="solid-button" type="submit" disabled={busy}>{busy ? "PUBLISHING THE PIECE…" : "PUBLISH THE PIECE"} <span aria-hidden="true">↗</span></button>
        </div>
        <div className="editor-form__media">
          <span className="eyebrow">THE PHOTOGRAPHS / UP TO 7</span>
          <p>Show it as it is. Each image can be up to 5 MB.</p>
          <input ref={fileInput} className="visually-hidden" type="file" accept="image/*" multiple onChange={(event) => chooseFiles(event.target.files)} />
          <button type="button" className="upload-drop" onClick={() => fileInput.current?.click()}><span aria-hidden="true">+</span><span>CHOOSE PHOTOGRAPHS</span><small>{images.length} / {maximumImages} ADDED</small></button>
          {previews.length > 0 && <div className="upload-previews">{previews.map((url, index) => <div className="upload-preview" key={url}><Image src={url} alt={`Preview ${index + 1}`} fill sizes="25vw" unoptimized /><button type="button" aria-label={`Remove image ${index + 1}`} onClick={() => removeImage(index)}>×</button></div>)}</div>}
          <Link className="editor-form__cancel" href="/seller/dashboard">CANCEL AND RETURN TO YOUR STUDIO</Link>
        </div>
      </form>
    </div>
  );
}
