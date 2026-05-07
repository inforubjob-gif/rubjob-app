export interface LineMessage {
  type: string;
  [key: string]: any; // Broad for now but better than any[]
}

export interface LineTextMessage extends LineMessage {
  type: "text";
  text: string;
}

export interface LineFlexMessage extends LineMessage {
  type: "flex";
  altText: string;
  contents: any; // Complex LINE Flex structure
}

export interface LinePushResponse {
  message?: string;
  [key: string]: any;
}
