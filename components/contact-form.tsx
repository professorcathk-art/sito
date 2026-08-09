"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { HoneypotField, useHoneypot } from "@/components/forms/honeypot-field";
import { HONEYPOT_FIELD } from "@/lib/honeypot";

export function ContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const { honeypotValue, setHoneypotValue, isSpam } = useHoneypot();
  const supabase = createClient();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (isSpam()) {
      setSuccess(true);
      return;
    }
    setLoading(true);

    try {
      // Save to Supabase
      const { error: dbError } = await supabase
        .from("contact_messages")
        .insert({
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: formData.message,
        });

      if (dbError) {
        throw dbError;
      }

      // Send email via API route
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...formData, [HONEYPOT_FIELD]: honeypotValue }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send email");
      }

      setSuccess(true);
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: "",
      });
    } catch (err: any) {
      setError(err.message || "Failed to submit contact form. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative space-y-6 mt-8">
      <HoneypotField value={honeypotValue} onChange={setHoneypotValue} id="contact_website_url_hp" />
      {error && (
        <div className="p-4 bg-red-900/30 border border-red-500/50 text-red-200 rounded-md">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-white/5 border border-border-default text-cyber-green rounded-md">
          Thank you for your message! We&apos;ll get back to you soon.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-custom-text mb-2">
            Name *
          </label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 bg-custom-bg border border-border-default rounded-md focus:ring-2 focus:ring-white/20 focus:border-white/20 text-custom-text placeholder-custom-text/50"
            placeholder="Your name"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-custom-text mb-2">
            Email *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 bg-custom-bg border border-border-default rounded-md focus:ring-2 focus:ring-white/20 focus:border-white/20 text-custom-text placeholder-custom-text/50"
            placeholder="your@email.com"
          />
        </div>
      </div>

      <div>
        <label htmlFor="subject" className="block text-sm font-medium text-custom-text mb-2">
          Subject *
        </label>
        <input
          id="subject"
          name="subject"
          type="text"
          value={formData.subject}
          onChange={handleChange}
          required
          className="w-full px-4 py-3 bg-custom-bg border border-border-default rounded-md focus:ring-2 focus:ring-white/20 focus:border-white/20 text-custom-text placeholder-custom-text/50"
          placeholder="What is this regarding?"
        />
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-custom-text mb-2">
          Message *
        </label>
        <textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          required
          rows={6}
          className="w-full px-4 py-3 bg-custom-bg border border-border-default rounded-md focus:ring-2 focus:ring-white/20 focus:border-white/20 text-custom-text placeholder-custom-text/50"
          placeholder="Your message..."
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-cyber-green text-slate-900 py-3 rounded-md font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl"
      >
        {loading ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}

