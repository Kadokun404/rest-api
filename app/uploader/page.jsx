import Uploader from "@/components/Uploader";

export const metadata = {
  title: "Uploader",
  description: "Upload file hingga 50 MB lewat POST /upload dan langsung dapat URL.",
  alternates: { canonical: "/uploader" }
};

export default function UploaderPage() {
  return (
    <div className="container fade-in">
      <div className="page-head">
        <h1>Uploader</h1>
        <p>Upload file hingga 50 MB lewat <code className="inline-code">POST /upload</code> (multipart, field <code className="inline-code">file</code>). Hasilnya langsung dapat URL.</p>
      </div>
      <Uploader />
    </div>
  );
}
