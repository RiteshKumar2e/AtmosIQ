"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Send } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button, Field, InlineAlert, Input, Textarea } from "@/components/ui";
import { useToast } from "@/hooks/useToast";
import { ApiError, contactApi } from "@/lib/api";

const contactSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Please enter your full name")
    .max(120, "Name must be 120 characters or fewer"),
  email: z.string().trim().email("Enter a valid email address"),
  organization: z
    .string()
    .trim()
    .max(160, "Organization must be 160 characters or fewer")
    .optional()
    .or(z.literal("")),
  subject: z
    .string()
    .trim()
    .min(3, "Please enter a subject")
    .max(200, "Subject must be 200 characters or fewer"),
  message: z
    .string()
    .trim()
    .min(10, "Please provide at least 10 characters so we can help")
    .max(4000, "Message must be 4000 characters or fewer"),
});

type ContactValues = z.infer<typeof contactSchema>;

export function ContactForm() {
  const toast = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      full_name: "",
      email: "",
      organization: "",
      subject: "",
      message: "",
    },
  });

  const onSubmit = async (values: ContactValues) => {
    setServerError(null);
    try {
      const response = await contactApi.send({
        full_name: values.full_name,
        email: values.email,
        organization: values.organization || undefined,
        subject: values.subject,
        message: values.message,
      });
      setSubmitted(true);
      reset();
      toast.success("Message sent", response.detail);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Your message could not be sent. Please try again.";
      setServerError(message);
      toast.error("Could not send message", message);
    }
  };

  if (submitted) {
    return (
      <div className="contact-form-card">
        <div className="contact-success">
          <span className="contact-success-icon" aria-hidden="true">
            <CheckCircle2 size={28} />
          </span>
          <h3>Message received</h3>
          <p>
            Thank you for reaching out. Our team reviews every enquiry and will respond within
            two working days.
          </p>
          <Button variant="secondary" onClick={() => setSubmitted(false)}>
            Send another message
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="contact-form-card">
      <h2 className="contact-form-title">Send us a message</h2>
      <p className="contact-form-subtitle">
        Fields marked with an asterisk are required.
      </p>

      {serverError ? <InlineAlert variant="error">{serverError}</InlineAlert> : null}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Field
          label="Full Name"
          htmlFor="contact-name"
          required
          error={errors.full_name?.message}
        >
          <Input
            {...register("full_name")}
            placeholder="Priya Raghavan"
            autoComplete="name"
          />
        </Field>

        <Field label="Email" htmlFor="contact-email" required error={errors.email?.message}>
          <Input
            {...register("email")}
            type="email"
            placeholder="you@organisation.org"
            autoComplete="email"
          />
        </Field>

        <Field
          label="Organization"
          htmlFor="contact-organization"
          hint="Optional — helps us route your enquiry to the right team."
          error={errors.organization?.message}
        >
          <Input
            {...register("organization")}
            placeholder="Central Pollution Control Board"
            autoComplete="organization"
          />
        </Field>

        <Field
          label="Subject"
          htmlFor="contact-subject"
          required
          error={errors.subject?.message}
        >
          <Input {...register("subject")} placeholder="Pilot deployment enquiry" />
        </Field>

        <Field
          label="Message"
          htmlFor="contact-message"
          required
          error={errors.message?.message}
        >
          <Textarea
            {...register("message")}
            rows={6}
            placeholder="Tell us about your region, your monitoring setup, and what you would like to achieve."
          />
        </Field>

        <Button type="submit" size="lg" block loading={isSubmitting}>
          {!isSubmitting ? <Send size={17} aria-hidden="true" /> : null}
          {isSubmitting ? "Sending…" : "Send Message"}
        </Button>
      </form>
    </div>
  );
}
