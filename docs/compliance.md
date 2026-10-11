# Privacy checks for business registers

Sources checked 11 October 2026. These checks review the records, not the organisation's overall legal compliance. They do not certify a business, apply to every country, or choose a lawful retention period.

| Check | Applies to | What the command checks | Source |
|---|---|---|---|
| RETENTION-REVIEW | NZ personal-data registers | Missing or past retention review date, unless a documented hold exists | [NZ Privacy Act principle 9](https://www.privacy.org.nz/privacy-principles/9/) |
| RETENTION-REVIEW | AU personal-data registers explicitly marked as APP entities | Same review prompt; Commonwealth records and other legal retention duties require separate assessment | [OAIC APP 11](https://www.oaic.gov.au/privacy/australian-privacy-principles-guidelines/chapter-11-app-11-security-of-personal-information) |
| ACCURACY-REVIEW | NZ personal-data registers | A missing or overdue accuracy review date | [NZ Privacy Act principle 8](https://www.privacy.org.nz/privacy-principles/8/) |
| PURPOSE-MISSING | Registers marked personal | Missing documented purpose is a business-policy flag supporting lawful collection review | [NZ principle 1](https://www.privacy.org.nz/privacy-principles/1/) and [AU APP 3](https://www.oaic.gov.au/privacy/australian-privacy-principles-guidelines/chapter-3-app-3-collection-of-solicited-personal-information) |

NZ principle 9 limits retention to the period needed for a lawful purpose. APP 11.2 requires reasonable steps to destroy or de-identify personal information no longer needed for a permitted purpose, subject to its exceptions. An overdue date here is a prompt to check that obligation. It is not proof of a legal breach. A hold records the reason to retain, but the operator must establish whether that reason is valid.

NZ principle 8 concerns reasonable accuracy checks before use or disclosure. The default 30-day review and 30-day stale-work rule are business policies, not statutory deadlines. Set your review interval and document why it fits the information. Changing an interval does not silently reschedule existing reviews.

`set-policy` configures jurisdiction, personal-data status, purpose, review interval and AU APP applicability. Imported registers start unclassified. Review them before operational use. `review` records who checked accuracy and the evidence note. `hold` records a reason and excludes that record from the retention due flag. `retention-review` still lists held records for review.

No command deletes records. Archiving retains them and does not satisfy a disposal obligation. An authorised disposal procedure must cover custom values, source copies, notes, reviews, exports, drafts and backups. The journal stores changed field names, not before/after personal values. Avoid personal information in field names and actor labels. Database administrators can change controls; this is not a tamper-proof journal.

The system does not supply identity management, tenant separation, consent collection, breach reporting, or legal advice. Keep the local files private. For hosted use, use a private database role with minimum privileges and restricted network access. The migration enables row-level security and grants no public access. Do not expose the database-owner credentials to end users.
