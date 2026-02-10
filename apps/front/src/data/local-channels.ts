export interface LocalProgram {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
}

export interface LocalChannelItem {
  id: string;
  name: string;
  slug: string;
  logo: string;
  description: string;
  streamUrl: string;
  schedule?: LocalProgram[];
}

export const localChannels: LocalChannelItem[] = [];
