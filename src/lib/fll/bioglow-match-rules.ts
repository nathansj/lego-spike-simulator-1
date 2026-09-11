export const BIOGLOW_MATCH_RULES = {
    recordVersion: 1,
    edition: 'BIOGLOW Founders Edition Challenge 2026-27',
    verifiedOn: '2026-09-11',
    sources: {
        seasonMaterials: {
            title: 'FIRST LEGO League BIOGLOW Season Materials',
            url: 'https://www.firstinspires.org/resources/library/fll/season-materials',
            locator:
                '2026-2027 BIOGLOW Season Materials > Founders Edition > FIRST LEGO League Challenge > Guidebook and Challenge Updates',
            revision: 'Live resource index checked 2026-09-11',
            supports: 'Selected Founders Edition Challenge and official rulebook link.'
        },
        rulebook: {
            title: 'FIRST LEGO League Challenge BIOGLOW Robot Game Rulebook',
            url: 'https://firstinspires.blob.core.windows.net/fll/challenge/2026-27/fll-challenge-bioglow-rgr.pdf',
            locator: 'page 4, Before the Match: “Each match lasts 2.5 minutes.”',
            revision:
                'No document revision or update date displayed; ©2026 FIRST and the LEGO Group.',
            supports: 'The official Robot Game match duration.'
        },
        challengeUpdates: {
            title: 'FIRST LEGO League Challenge BIOGLOW Challenge Updates',
            url: 'https://firstinspires.blob.core.windows.net/fll/challenge/2026-27/fll-challenge-bioglow-updates.pdf',
            locator: 'page 1, Update 01, updated September 2, 2026',
            revision: 'Update 01, 2026-09-02',
            supports:
                'Current official update set reviewed with the selected Founders Edition rulebook.'
        }
    },
    duration: {
        minutes: 2.5,
        seconds: 150,
        evaluationTiming: 'The official match end occurs when the 2.5-minute duration expires.',
        source: 'rulebook page 4, Before the Match'
    },
    limitations: {
        manualFinish:
            'A simulator may let a user manually finish a practice run before 150 seconds; that convenience action is not the official match-duration rule.',
        globalEligibility:
            'This record does not implement global robot-game eligibility, penalties, or any rule that can invalidate mission points.',
        scoring:
            'This record does not implement mission scoring or determine whether any mission requirement is visibly met at match end.'
    }
} as const;

export type BioglowMatchRules = typeof BIOGLOW_MATCH_RULES;
