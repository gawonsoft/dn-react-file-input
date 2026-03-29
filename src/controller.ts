import { base64Uploader } from "./base64_uploader";
import { generateSizeMetadata } from "./metadata";

export type FileMetadata = {
  size: number | undefined;
  type: string | undefined;
  name: string | undefined;
  width: number | undefined;
  height: number | undefined;
  thumbnail: string | undefined;
};

export type FileSnapshot<TFile> = {
  uniqueKey: string;
  aspectRatio: number | undefined;
  isLoading: boolean;
  file: TFile;
} & FileMetadata;

export type FileUploader<TFile> = (
  file: File,
) => Awaited<TFile> | Promise<Awaited<TFile>>;

export type FileInputSubscriber = () => void;

export type DefaultValueOf<TFile> = {
  file: TFile;
} & Partial<FileMetadata>;

export type FileInputControllerOptions<TFile> = {
  uploader?: FileUploader<TFile>;
  defaultValue?: DefaultValueOf<TFile>[] | DefaultValueOf<TFile>;
  multiple?: boolean;
  squentialUploads?: boolean;
  onUploaded?: (file: TFile, snapshot: FileSnapshot<TFile>) => void;
};

export class FileInputController<TFile> {
  protected _isDragOver = false;

  get isDragOver() {
    return this._isDragOver;
  }

  set isDragOver(value: boolean) {
    const isUpdated = this._isDragOver !== value;

    this._isDragOver = value;

    if (isUpdated) {
      this.notify();
    }
  }

  protected _snapshots: FileSnapshot<TFile>[] = [];

  get snapshots() {
    return [...this._snapshots];
  }

  set snapshots(value: FileSnapshot<TFile>[]) {
    this._snapshots = value;
    this.notify();
  }

  get uploadedFiles() {
    return this._snapshots
      .filter((snapshot) => !snapshot.isLoading)
      .map((snapshot) => snapshot.file);
  }

  protected subscribers: FileInputSubscriber[] = [];

  protected uploader: FileUploader<TFile>;

  protected multiple: boolean;

  protected squentialUploads: boolean;

  protected onUploaded?: (file: TFile, snapshot: FileSnapshot<TFile>) => void;

  constructor({
    uploader,
    defaultValue,
    multiple = true,
    onUploaded,
    squentialUploads,
  }: FileInputControllerOptions<TFile> = {}) {
    this.multiple = multiple;

    this.uploader = uploader || (base64Uploader as FileUploader<TFile>);

    this._snapshots =
      (Array.isArray(defaultValue)
        ? defaultValue
        : defaultValue
          ? [defaultValue]
          : []
      )?.map(({ width, height, size, type, name, file, thumbnail }) => ({
        uniqueKey: crypto.randomUUID(),
        aspectRatio: width && height ? width / height : undefined,
        isLoading: false,
        name,
        size,
        type,
        width,
        height,
        thumbnail,
        file,
      })) || [];

    this.onUploaded = onUploaded;

    this.squentialUploads = squentialUploads || false;
  }

  subscribe(subscriber: () => void) {
    this.subscribers.push(subscriber);

    return () => {
      const index = this.subscribers.indexOf(subscriber);
      if (index !== -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  async upload(files: File[]): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const file of files) {
      const snapshot = await this.addSnapshot(file);

      if (this.squentialUploads) {
        await this.uploadForEach(file, snapshot);
      } else {
        promises.push(this.uploadForEach(file, snapshot));
      }
    }

    await Promise.all(promises);
  }

  async addSnapshot(file: File) {
    const { type, name, size } = file;

    const { width, height, thumbnail } = await generateSizeMetadata(file);

    const aspectRatio = width && height ? width / height : undefined;

    const uniqueKey = crypto.randomUUID();

    const snapshot1 = {
      uniqueKey,
      isLoading: true,
      size,
      type,
      name,
      width,
      height,
      aspectRatio,
      thumbnail,
      file: {} as TFile,
    };

    this.snapshots = this.multiple
      ? [...this.snapshots, snapshot1]
      : [snapshot1];

    return snapshot1;
  }

  async uploadForEach(file: File, snapshot1: FileSnapshot<TFile>): Promise<void> {
    const uploadedFile = await this.uploader(file);

    snapshot1.isLoading = false;
    snapshot1.file = uploadedFile;

    if (this.onUploaded) {
      this.onUploaded(uploadedFile, snapshot1);
    }
  }

  remove(snapshot: FileSnapshot<TFile>) {
    this.snapshots = this.snapshots.filter(
      (s) => s.uniqueKey !== snapshot.uniqueKey,
    );
  }

  notify() {
    for (const subscriber of this.subscribers) {
      subscriber();
    }
  }
}
