module.exports = {
  __esModule: true,
  pick: jest.fn(async () => [
    {
      name: 'theme.pdf',
      size: 1234,
      type: 'application/pdf',
      uri: 'file:///theme.pdf',
    },
  ]),
  types: {
    audio: 'audio/*',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    images: 'image/*',
    pdf: 'application/pdf',
    plainText: 'text/plain',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    video: 'video/*',
  },
};
