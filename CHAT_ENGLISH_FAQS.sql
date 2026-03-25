-- English FAQ entries for GoArtisans chat assistant
-- Run this in Supabase SQL Editor AFTER running CHAT_SYSTEM_SETUP.sql

-- Add language column if it doesn't exist (defaults existing French FAQs to 'fr')
ALTER TABLE public.faq_articles
  ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'fr';

INSERT INTO faq_articles (question, answer, category, language, is_active) VALUES

-- Registration & Account
('How do I create an account on GoArtisans?', 'Click "Sign Up" on the homepage, choose your role (Client or Artisan), fill in your details, and verify your email. Setup takes under 2 minutes.', 'registration', 'en', true),
('How do I register as an artisan?', 'Go to the Sign Up page, select "I am an Artisan", fill in your professional details and skills, then verify your email. You can start receiving job requests right away.', 'registration', 'en', true),
('I forgot my password. How do I reset it?', 'Click "Forgot Password" on the login page, enter your email address, and check your inbox for a reset link. The link expires in 30 minutes.', 'account', 'en', true),
('How do I update my profile information?', 'Go to your profile page and click the edit button. You can update your name, photo, skills, location, and hourly rate at any time.', 'account', 'en', true),
('Can I delete my account?', 'Yes. Go to your account settings and click "Delete Account". This action is permanent and removes all your data. Contact support if you need help.', 'account', 'en', true),

-- For Clients
('How do I post a job on GoArtisans?', 'Click "Post a Job" in your dashboard, describe the work needed, set your budget, choose the location, and submit. Artisans will send you quotes within hours.', 'jobs', 'en', true),
('How do I choose the right artisan?', 'Compare artisan profiles by reading their reviews, checking their portfolio, verifying their skills, and reviewing their quote. You can also message them before hiring.', 'clients', 'en', true),
('Can I get multiple quotes for the same job?', 'Yes, multiple artisans can send you quotes for the same job. You choose the one that best fits your budget and requirements.', 'clients', 'en', true),
('What happens after I accept a quote?', 'After accepting a quote, you and the artisan are connected. Agree on a start date, and the artisan will come to complete the work. Payment is released after you confirm completion.', 'clients', 'en', true),
('How do I leave a review for an artisan?', 'After the job is marked as complete, you will receive a notification asking you to rate the artisan. You can give a star rating and write a comment.', 'clients', 'en', true),

-- For Artisans
('How do I receive job requests?', 'Set up your profile with your skills and location. Our system will automatically notify you of matching jobs. You can also browse all available jobs and send quotes directly.', 'artisans', 'en', true),
('How do I send a quote to a client?', 'Open the job listing, click "Send a Quote", enter your price, estimated duration, and a short description of your approach, then submit.', 'artisans', 'en', true),
('How do I set up job alerts?', 'Go to your dashboard, click "Job Alerts", and create an alert with your preferred skills, location, and budget range. We will notify you instantly when matching jobs are posted.', 'artisans', 'en', true),
('Can I work in multiple locations?', 'Yes. You can set a primary location and a service radius in your profile, or add multiple cities where you are available to work.', 'artisans', 'en', true),
('How do I showcase my previous work?', 'Go to your profile and upload photos to your portfolio section. Clients can see your past work before deciding to hire you.', 'artisans', 'en', true),

-- Payments
('How does payment work on GoArtisans?', 'Clients pay through the platform after the job is completed and confirmed. Funds are held securely during the job and released to the artisan once you approve the work.', 'payments', 'en', true),
('What payment methods are accepted?', 'We accept all major credit and debit cards, as well as mobile money options depending on your region. Payment is processed securely through our platform.', 'payments', 'en', true),
('When do artisans get paid?', 'Artisans receive payment within 2–3 business days after the client confirms the job is complete.', 'payments', 'en', true),
('Is there a commission fee?', 'GoArtisans charges a small service fee on each completed transaction to maintain and improve the platform. The fee is shown transparently before you confirm a job.', 'payments', 'en', true),
('What happens if a client refuses to pay?', 'If a client refuses to approve payment after work is completed, contact our support team at support@goartisans.online. We will review the case and mediate a resolution.', 'payments', 'en', true),

-- Disputes & Support
('How do I report a problem with a job?', 'Go to the job in your dashboard and click "Report an Issue". Describe the problem clearly. Our support team will review and respond within 24 hours.', 'support', 'en', true),
('What if the artisan does not show up?', 'If an artisan misses a confirmed appointment without notice, contact our support team immediately. We will help you find a replacement as quickly as possible.', 'support', 'en', true),
('How do I contact GoArtisans support?', 'You can reach us by email at support@goartisans.online or through the contact form on the website. We typically respond within 24 hours on business days.', 'support', 'en', true),
('Is my personal data secure?', 'Yes. We take data privacy seriously. Personal information is encrypted, never sold to third parties, and handled according to our Privacy Policy.', 'support', 'en', true),
('What services are available on GoArtisans?', 'GoArtisans covers a wide range of home services including plumbing, electrical work, masonry, carpentry, painting, tiling, roofing, HVAC, gardening, and more.', 'general', 'en', true),

-- Trust & Safety
('Are artisans verified on GoArtisans?', 'Artisans go through a profile verification process. Clients can also see ratings and reviews from previous jobs, which helps you choose reliable professionals.', 'trust', 'en', true),
('What if I am not satisfied with the work?', 'Contact the artisan first to discuss the issue. If it cannot be resolved, file a dispute through our platform and our team will mediate a fair solution.', 'trust', 'en', true),
('Can I follow an artisan I trust?', 'Yes. You can follow artisans to get notified when they are available or when they post updates. Find the follow button on their profile page.', 'trust', 'en', true),
('Is GoArtisans available in my city?', 'GoArtisans is expanding across multiple cities. Search for available artisans in your area from the homepage — if none are available yet, check back soon or contact us to request your city.', 'general', 'en', true),
('How do I cancel a job?', 'You can cancel a job before work starts from your dashboard. If work has already begun, contact the artisan directly and then file a cancellation request through support.', 'jobs', 'en', true);
