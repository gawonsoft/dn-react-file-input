import {
  base64Uploader,
  FileInputArea,
  FileInputController,
  FilePreview,
  useFiles,
  useIsDragOver,
} from "dn-react-file-input";
import { useRef } from "react";

export default function App() {
  const controllerRef = useRef<FileInputController<{
    src: string;
    alt: string;
  }> | null>(null);

  const files = useFiles(controllerRef);

  const isDragOver = useIsDragOver(controllerRef);

  return (
    <div>
      <div className="preview-list">
        {files.length > 0
          ? files.map((snapshot) => {
            return (
              <div key={snapshot.uniqueKey} className="preview-container">
                {
                  snapshot.isLoading ? (
                    <div className="preview-loading">Loading...</div>
                  ) : (
                    (() => {
                      if (snapshot.type?.startsWith("image/")) {
                        return <img src={snapshot.file.src} alt={snapshot.file.alt} className="preview-image" />;
                      }

                      if (snapshot.type?.startsWith("video/")) {
                        return (
                          <video controls className="preview-video">
                            <source src={snapshot.file.src} type={snapshot.type} />
                            Your browser does not support the video tag.
                          </video>
                        );
                      }

                      return <div className="preview-unsupported">Unsupported file type</div>;
                    })()
                  )
                }
                <button
                  className="preview-remove-button"
                  onClick={() => {
                    controllerRef.current?.remove(snapshot);
                  }}
                >
                  X
                </button>
              </div>
            );
          })
          : null}
      </div>
      <div className="app">
        <FileInputArea
          ref={controllerRef}
          className={"file-input-area" + (isDragOver ? " drag-over" : "")}
          uploader={async (file) => {
            await new Promise((resolve) => setTimeout(resolve, 2000));

            return base64Uploader(file);
          }}
          defaultValue={[
            {
              width: 100,
              height: 100,
              type: "image/jpeg",
              name: "placeholder.jpg",
              file: {
                src: "https://picsum.photos/100/100",
                alt: "Placeholder Image",
              },
            },
          ]}
        >
          파일을 여기로 끌어다 놓거나 클릭해서 업로드하세요.
        </FileInputArea>
      </div>
    </div>
  );
}
