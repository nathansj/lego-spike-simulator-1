export type PracticeResultKind = 'stopped' | 'startup-failure' | 'runtime-failure';

export interface PracticeResult {
    kind: PracticeResultKind;
    message: string;
}
