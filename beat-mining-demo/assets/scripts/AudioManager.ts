import { _decorator, AudioClip, AudioSource, Component, EventKeyboard, input, Input, Node, resources } from 'cc';
import { MusicTrackConfig } from './MusicTrackConfig';
const { ccclass } = _decorator;

type SoundName = 'swing' | 'good' | 'perfect' | 'rock_break' | 'collect';

@ccclass('AudioManager')
export class AudioManager extends Component {
    private bgmSource!: AudioSource;
    private sfxSource!: AudioSource;
    private bgm: AudioClip | null = null;
    private sounds = new Map<SoundName, AudioClip>();
    private userInteracted = false;
    private calibrationActive = false;
    private calibrationAudioContext: AudioContext | null = null;
    private onMusicStarted: (() => void) | null = null;

    initialize(track: Readonly<MusicTrackConfig>, onMusicStarted: () => void): void {
        this.onMusicStarted = onMusicStarted;
        this.bgmSource = this.makeSource('BGM', 0.32);
        this.bgmSource.loop = true;
        this.sfxSource = this.makeSource('SFX', 0.7);

        resources.load(track.resourcePath, AudioClip, (error, clip) => {
            if (error || !this.isValid) return;
            this.bgm = clip;
            this.tryStartMusic();
        });
        (['swing', 'good', 'perfect', 'rock_break', 'collect'] as SoundName[]).forEach((name) => {
            resources.load(`audio/${name}`, AudioClip, (error, clip) => {
                if (!error && this.isValid) this.sounds.set(name, clip);
            });
        });
        input.on(Input.EventType.KEY_DOWN, this.onFirstInput, this);
    }

    get ready(): boolean { return this.bgm !== null && this.sounds.size === 5; }
    get musicPlaying(): boolean { return this.bgmSource?.playing ?? false; }
    get musicTime(): number { return this.bgmSource?.currentTime ?? 0; }

    playSwing(): void { this.play('swing', 0.55); }
    playGood(): void { this.play('good', 0.65); }
    playPerfect(hotHand = false): void { this.play('perfect', hotHand ? 0.95 : 0.82); }
    playRockBreak(): void { this.play('rock_break', 0.72); }
    playCollect(): void { this.play('collect', 0.78); }

    beginCalibration(): void {
        this.calibrationActive = true;
        if (this.bgmSource?.playing) this.bgmSource.stop();
        this.prepareCalibrationAudio();
    }

    endCalibration(): void {
        this.calibrationActive = false;
        this.tryStartMusic();
    }

    playCalibrationBeep(): void {
        try {
            this.prepareCalibrationAudio();
            if (!this.calibrationAudioContext) return;
            const context = this.calibrationAudioContext;
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, context.currentTime);
            gain.gain.setValueAtTime(0.0001, context.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.09);
            oscillator.connect(gain);
            gain.connect(context.destination);
            oscillator.start(context.currentTime);
            oscillator.stop(context.currentTime + 0.1);
        } catch {}
    }

    private prepareCalibrationAudio(): void {
        try {
            const AudioContextClass = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
            if (!AudioContextClass) return;
            this.calibrationAudioContext ??= new AudioContextClass();
            if (this.calibrationAudioContext.state === 'suspended') void this.calibrationAudioContext.resume();
        } catch {}
    }

    protected onDestroy(): void {
        input.off(Input.EventType.KEY_DOWN, this.onFirstInput, this);
    }

    private makeSource(name: string, volume: number): AudioSource {
        const node = new Node(name);
        this.node.addChild(node);
        const source = node.addComponent(AudioSource);
        source.volume = volume;
        return source;
    }

    private onFirstInput(_event: EventKeyboard): void {
        this.userInteracted = true;
        this.tryStartMusic();
    }

    private tryStartMusic(): void {
        if (!this.userInteracted || this.calibrationActive || !this.bgm || this.bgmSource.playing) return;
        this.bgmSource.clip = this.bgm;
        this.bgmSource.play();
        this.onMusicStarted?.();
    }

    private play(name: SoundName, volume: number): void {
        const clip = this.sounds.get(name);
        if (clip) this.sfxSource.playOneShot(clip, volume);
    }
}
