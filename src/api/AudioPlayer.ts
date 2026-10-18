export const playAudio: any = () => {};
export const createAudioPlayer: any = () => ({
    play: () => {},
    pause: () => {},
    seek: () => {},
    mute: () => {},
    speed: () => {},
    delete: () => {},
    duration: 0
});
export const defaultAudioNames: any = {};
export interface AudioPlayerInterface {
    [key: string]: any;
}
export type AudioProcessor = any;
export type PreprocessAudioData = any;