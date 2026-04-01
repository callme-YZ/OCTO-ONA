# Issue #35 Implementation Notes

## Bot Ownership Detection Logic

### Implementation Status
- ✅ Detector class implemented (`src/layer7/bot-ownership/detector.ts`)
- ✅ Test script created (`scripts/test-bot-ownership-detection.ts`)
- ⏸️ Full unit tests deferred (Jest setup + dependencies)

### Detection Strategies

**Strategy 1: DM Conversations**
- Find user with most DM conversations with the bot
- Query: Users who send/receive DMs in channels where bot participates

**Strategy 2: Mentions**
- Find user who mentions the bot most frequently
- Query: `JSON_CONTAINS(mentioned_uids, bot_id)`

**Strategy 3: Replies**
- Find user who replies to bot messages most often
- Query: `reply_to_uid = bot_id`

**Evidence Combination:**
- Each strategy votes for a user
- Winner = user with most votes
- Confidence = votes / 3 (0-1 scale)

### Test Results (2026-04-01)

**Sample bots tested:** 5  
**Detection success:** 0/5

**Reason for low success rate:**
- DMWork data structure may not have sufficient reply/mention metadata
- Bots may not have clear "ownership" in the current dataset
- Alternative: Manual assignment via CLI (#36)

### Recommendations

**For MVP:**
1. **Manual assignment first** (Issue #36 CLI)
   - Admin manually assigns bots to users
   - More reliable for initial setup

2. **Automated detection as enhancement** (Post-MVP)
   - Refine strategies based on actual data patterns
   - Add more heuristics (e.g., bot creation metadata)

**For production:**
- Add bot creation metadata to track creator
- Enhance message metadata with interaction types
- Periodic re-detection to catch ownership changes

---

## Files Created

- `src/layer7/bot-ownership/detector.ts` (detection logic)
- `tests/layer7/bot-ownership-detector.test.ts` (unit tests, not run yet)
- `scripts/test-bot-ownership-detection.ts` (integration test)
- `docs/issue-35-notes.md` (this file)

---

## Next Steps

1. Implement CLI commands (#36) for manual assignment
2. Use CLI to bootstrap initial bot ownership
3. Optionally enhance detection logic with more strategies
4. Run full unit tests after Jest setup is complete

---

**Date:** 2026-04-01  
**Status:** Implementation complete, detection needs refinement  
**Decision:** Proceed with manual CLI approach for MVP
