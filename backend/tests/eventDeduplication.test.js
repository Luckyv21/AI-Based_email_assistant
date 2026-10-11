const assert = require("node:assert/strict");
const test = require("node:test");
const {
    isCancellationEmail,
    extractKeywords,
    calculateKeywordOverlap
} = require("../services/eventService");

test("isCancellationEmail accurately detects cancellation intent in emails", () => {
    assert.equal(
        isCancellationEmail({
            subject: "Meeting Cancelled: Project Discussion",
            body: "Hi team, unfortunately our meeting today is cancelled due to unavoidable circumstances."
        }),
        true
    );

    assert.equal(
        isCancellationEmail({
            subject: "Project Demo Call Off",
            body: "Sorry guys, we are calling off the presentation session this week."
        }),
        true
    );

    assert.equal(
        isCancellationEmail({
            subject: "Unable to attend the interview",
            body: "I am unable to attend the interview scheduled for tomorrow."
        }),
        true
    );

    // Should NOT flag ordinary meeting invites as cancellations
    assert.equal(
        isCancellationEmail({
            subject: "Project Discussion & Demo",
            body: "Hi, let's meet for the project demonstration on October 25, 2026 at 3:00 PM in the Lab."
        }),
        false
    );

    assert.equal(
        isCancellationEmail({
            subject: "Newsletter for October",
            body: "Here are the top stories for this week."
        }),
        false
    );
});

test("keyword extraction filters stopwords and extracts core terms", () => {
    const keywords = extractKeywords("Hi team, let's meet for our project demonstration and discussion");
    assert.ok(keywords.includes("project"));
    assert.ok(keywords.includes("demonstration"));
    assert.ok(keywords.includes("discussion"));
    assert.ok(!keywords.includes("the"));
    assert.ok(!keywords.includes("our"));
    assert.ok(!keywords.includes("and"));
});

test("calculateKeywordOverlap detects high semantic similarity between related event titles", () => {
    const wordsA = extractKeywords("Project Discussion & Demo");
    const wordsB = extractKeywords("Project Demonstration and Discussion Rescheduled");
    const overlap = calculateKeywordOverlap(wordsA, wordsB);
    assert.ok(overlap > 0.3, `Expected overlap > 0.3, got ${overlap}`);

    const unrelatedWords = extractKeywords("Semester Exam Hall Ticket Released");
    const lowOverlap = calculateKeywordOverlap(wordsA, unrelatedWords);
    assert.ok(lowOverlap < 0.1, `Expected low overlap < 0.1, got ${lowOverlap}`);
});
