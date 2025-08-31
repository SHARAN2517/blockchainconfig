import { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";
import { Upload, Shield, CheckCircle, XCircle, FileText, Image, Video, Music, Hash, Clock, AlertTriangle } from "lucide-react";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Badge } from "./components/ui/badge";
import { Progress } from "./components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { toast, Toaster } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [activeTab, setActiveTab] = useState("upload");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [verifyHash, setVerifyHash] = useState("");
  const [verificationResult, setVerificationResult] = useState(null);

  // Fetch uploaded files
  const fetchMedia = async () => {
    try {
      const response = await axios.get(`${API}/media`);
      setUploadedFiles(response.data);
    } catch (error) {
      console.error("Error fetching media:", error);
    }
  };

  // Fetch verifications
  const fetchVerifications = async () => {
    try {
      const response = await axios.get(`${API}/verifications`);
      setVerifications(response.data);
    } catch (error) {
      console.error("Error fetching verifications:", error);
    }
  };

  useEffect(() => {
    fetchMedia();
    fetchVerifications();
  }, []);

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    toast.info("Uploading and analyzing file...");

    try {
      const response = await axios.post(`${API}/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("File uploaded and analyzed successfully!");
      fetchMedia();
      setActiveTab("dashboard");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Upload failed: " + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Handle hash verification - fixed version
  const handleHashVerification = async () => {
    console.log("handleHashVerification called with hash:", verifyHash);
    
    if (!verifyHash.trim()) {
      toast.error("Please enter a hash to verify");
      return;
    }

    setLoading(true);
    setVerificationResult(null);
    toast.info("Verifying hash...");

    try {
      const url = `${API}/verify/${verifyHash.trim()}`;
      console.log("Making API call to:", url);
      
      const response = await axios.post(url);
      console.log("API response:", response.data);
      
      setVerificationResult(response.data);
      toast.success("Hash verification complete!");
      fetchVerifications();
    } catch (error) {
      console.error("Verification error:", error);
      toast.error("Verification failed: " + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Get file type icon
  const getFileTypeIcon = (fileType) => {
    if (fileType.startsWith("image/")) return <Image className="w-5 h-5" />;
    if (fileType.startsWith("video/")) return <Video className="w-5 h-5" />;
    if (fileType.startsWith("audio/")) return <Music className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
  };

  // Get risk level color
  const getRiskLevelColor = (riskLevel) => {
    switch (riskLevel) {
      case "low": return "bg-green-100 text-green-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "high": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Toaster position="top-right" richColors />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <Shield className="w-12 h-12 text-indigo-600 mr-4" />
            <h1 className="text-5xl font-bold text-gray-900 tracking-tight">
              BlockID Guardian
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Blockchain-powered deepfake detection and identity protection system. 
            Verify media authenticity with AI analysis and tamper-proof blockchain verification.
          </p>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="upload" className="flex items-center space-x-2">
              <Upload className="w-4 h-4" />
              <span>Upload & Analyze</span>
            </TabsTrigger>
            <TabsTrigger value="verify" className="flex items-center space-x-2">
              <Hash className="w-4 h-4" />
              <span>Verify Hash</span>
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <Shield className="w-4 h-4" />
              <span>Dashboard</span>
            </TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-6">
            <Card className="border-2 border-dashed border-indigo-300 bg-white/70 backdrop-blur-sm">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl text-indigo-900">Upload Media for Analysis</CardTitle>
                <CardDescription className="text-lg">
                  Upload images, videos, or audio files to generate blockchain-verified hashes and detect deepfakes
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="max-w-md mx-auto">
                  <input
                    type="file"
                    accept="image/*,video/*,audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                    disabled={loading}
                  />
                  <label
                    htmlFor="file-upload"
                    className={`block w-full p-8 border-2 border-dashed border-indigo-300 rounded-xl cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/50 transition-all duration-300 ${
                      loading ? "cursor-not-allowed opacity-50" : ""
                    }`}
                  >
                    <Upload className="w-12 h-12 text-indigo-500 mx-auto mb-4" />
                    <p className="text-lg font-medium text-indigo-900 mb-2">
                      {loading ? "Processing..." : "Choose File to Upload"}
                    </p>
                    <p className="text-sm text-gray-600">
                      Supports images, videos, and audio files
                    </p>
                  </label>
                  {loading && (
                    <div className="mt-6">
                      <Progress value={75} className="w-full" />
                      <p className="text-sm text-gray-600 mt-2">Analyzing with AI and storing on blockchain...</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Verify Tab */}
          <TabsContent value="verify" className="space-y-6">
            <Card className="bg-white/70 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-2xl text-indigo-900">Verify File Hash</CardTitle>
                <CardDescription className="text-lg">
                  Enter a file hash to verify its authenticity against blockchain records
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex space-x-4">
                  <Input
                    placeholder="Enter file hash (SHA256)"
                    value={verifyHash}
                    onChange={(e) => setVerifyHash(e.target.value)}
                    className="flex-1 text-lg p-4"
                  />
                  <Button
                    onClick={handleHashVerification}
                    disabled={loading || !verifyHash.trim()}
                    size="lg"
                    className="px-8"
                  >
                    {loading ? "Verifying..." : "Verify"}
                  </Button>
                  <Button
                    onClick={() => {
                      console.log("Test button clicked");
                      setVerificationResult({
                        id: "test-id",
                        file_hash: "test-hash",
                        is_authentic: true,
                        confidence_score: 0.95,
                        blockchain_verified: true,
                        analysis_details: {
                          risk_level: "low",
                          analysis_summary: "Test result for debugging"
                        }
                      });
                    }}
                    variant="outline"
                    size="lg"
                    className="px-4"
                  >
                    Test
                  </Button>
                </div>

                {verificationResult && (
                  <div className="mt-6 p-4 border-2 border-blue-500 bg-blue-50 rounded-lg">
                    <h3 className="text-lg font-bold text-blue-900 mb-2">DEBUG: Verification Result Found</h3>
                    <pre className="text-sm bg-white p-3 rounded border overflow-x-auto">
                      {JSON.stringify(verificationResult, null, 2)}
                    </pre>
                  </div>
                )}

                {verificationResult && (
                  <Card className={`border-2 ${verificationResult.is_authentic ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        {verificationResult.is_authentic ? (
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        ) : (
                          <XCircle className="w-6 h-6 text-red-600" />
                        )}
                        <span>
                          {verificationResult.is_authentic ? "Authentic Media" : "Suspicious Media"}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Confidence Score</p>
                          <p className="text-2xl font-bold">
                            {(verificationResult.confidence_score * 100).toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Blockchain Verified</p>
                          <Badge variant={verificationResult.blockchain_verified ? "default" : "destructive"}>
                            {verificationResult.blockchain_verified ? "Yes" : "No"}
                          </Badge>
                        </div>
                      </div>
                      {verificationResult.analysis_details?.risk_level && (
                        <div>
                          <p className="text-sm font-medium text-gray-600 mb-2">Risk Level</p>
                          <Badge className={getRiskLevelColor(verificationResult.analysis_details.risk_level)}>
                            {verificationResult.analysis_details.risk_level.toUpperCase()}
                          </Badge>
                        </div>
                      )}
                      {verificationResult.analysis_details?.analysis_summary && (
                        <div>
                          <p className="text-sm font-medium text-gray-600 mb-2">Analysis Summary</p>
                          <p className="text-sm text-gray-800 bg-white/50 p-3 rounded-lg">
                            {verificationResult.analysis_details.analysis_summary}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Uploaded Files */}
              <Card className="bg-white/70 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-indigo-600" />
                    <span>Protected Files</span>
                  </CardTitle>
                  <CardDescription>Files uploaded and verified on blockchain</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {uploadedFiles.map((file) => (
                      <div key={file.id} className="flex items-center space-x-3 p-3 bg-white/60 rounded-lg">
                        {getFileTypeIcon(file.file_type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.filename}
                          </p>
                          <p className="text-xs text-gray-500">
                            Hash: {file.file_hash.substring(0, 16)}...
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <p className="text-xs text-gray-500">
                              {new Date(file.upload_timestamp).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          <Badge variant={file.verification_status === "verified" ? "default" : "secondary"}>
                            {file.verification_status}
                          </Badge>
                          {file.deepfake_analysis && (
                            <Badge 
                              className={getRiskLevelColor(file.deepfake_analysis.risk_level)}
                              variant="outline"
                            >
                              {file.deepfake_analysis.risk_level || "unknown"}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    {uploadedFiles.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No files uploaded yet</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Verifications */}
              <Card className="bg-white/70 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Hash className="w-5 h-5 text-indigo-600" />
                    <span>Recent Verifications</span>
                  </CardTitle>
                  <CardDescription>Hash verification history</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {verifications.map((verification) => (
                      <div key={verification.id} className="flex items-center space-x-3 p-3 bg-white/60 rounded-lg">
                        {verification.is_authentic ? (
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {verification.file_hash.substring(0, 24)}...
                          </p>
                          <p className="text-xs text-gray-500">
                            Confidence: {(verification.confidence_score * 100).toFixed(1)}%
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <p className="text-xs text-gray-500">
                              {new Date(verification.verification_timestamp).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant={verification.is_authentic ? "default" : "destructive"}>
                          {verification.is_authentic ? "Authentic" : "Suspicious"}
                        </Badge>
                      </div>
                    ))}
                    {verifications.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Hash className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No verifications performed yet</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;