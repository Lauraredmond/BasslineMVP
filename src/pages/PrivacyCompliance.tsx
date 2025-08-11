import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ChevronDown, Download, Calendar, Shield, Database } from "lucide-react";

const PrivacyCompliance = () => {
  const [showPIIReport, setShowPIIReport] = useState(false);
  const [showROPAReport, setShowROPAReport] = useState(false);
  const [showDSARReport, setShowDSARReport] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 px-4 pt-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-4">
            Privacy & Compliance
          </h1>
          <p className="text-lg text-muted-foreground">
            Your data transparency hub
          </p>
        </div>

        {/* Hero Privacy Image Placeholder */}
        <div className="w-full h-32 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl mb-8 flex items-center justify-center">
          <span className="text-4xl">🔒</span>
        </div>

        {/* Privacy Controls */}
        <div className="space-y-4 mb-8">
          {/* PII Ageing Report */}
          <Card className="shadow-card border-0">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Database className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Show My PII Ageing</h3>
                  <p className="text-sm text-muted-foreground">
                    See how long your personal data has been stored
                  </p>
                </div>
              </div>
              <Collapsible open={showPIIReport} onOpenChange={setShowPIIReport}>
                <CollapsibleTrigger asChild>
                  <Button className="w-full mt-4 bg-primary hover:bg-burgundy-dark">
                    <span>View PII Ageing Report</span>
                    <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${showPIIReport ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <div className="bg-muted/30 rounded-lg p-4 space-y-4">
                    <h4 className="font-semibold text-primary mb-3">Personal Data Age Breakdown</h4>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-background rounded border">
                        <div>
                          <p className="font-medium">Account Information</p>
                          <p className="text-sm text-muted-foreground">Name, email, profile</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-primary">127 days</p>
                          <p className="text-xs text-muted-foreground">Since: Mar 2024</p>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center p-3 bg-background rounded border">
                        <div>
                          <p className="font-medium">Workout Data</p>
                          <p className="text-sm text-muted-foreground">Exercise logs, performance</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-primary">90 days</p>
                          <p className="text-xs text-muted-foreground">Since: Apr 2024</p>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center p-3 bg-background rounded border">
                        <div>
                          <p className="font-medium">Music Sync Logs</p>
                          <p className="text-sm text-muted-foreground">Playlist preferences, BPM data</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-primary">30 days</p>
                          <p className="text-xs text-muted-foreground">Since: Jun 2024</p>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center p-3 bg-background rounded border">
                        <div>
                          <p className="font-medium">Trainer Interactions</p>
                          <p className="text-sm text-muted-foreground">Session notes, feedback</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-primary">45 days</p>
                          <p className="text-xs text-muted-foreground">Since: May 2024</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-burgundy-light rounded border border-primary/20">
                      <p className="text-sm text-primary">
                        💡 <strong>Suggestion:</strong> You can request deletion of any data older than 90 days. 
                        Contact us or use the data deletion option in your profile settings.
                      </p>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          {/* ROPA Report */}
          <Card className="shadow-card border-0">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Generate ROPA Report</h3>
                  <p className="text-sm text-muted-foreground">
                    Record of Processing Activities for compliance
                  </p>
                </div>
              </div>
              <Collapsible open={showROPAReport} onOpenChange={setShowROPAReport}>
                <CollapsibleTrigger asChild>
                  <Button className="w-full mt-4 bg-primary hover:bg-burgundy-dark">
                    <span>Generate ROPA Report</span>
                    <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${showROPAReport ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <div className="bg-muted/30 rounded-lg p-4">
                    <h4 className="font-semibold text-primary mb-3">Record of Processing Activities</h4>
                    
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Purpose</TableHead>
                          <TableHead>Data Categories</TableHead>
                          <TableHead>Processor</TableHead>
                          <TableHead>Retention</TableHead>
                          <TableHead>Legal Basis</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">Fitness Planning</TableCell>
                          <TableCell>Workout preferences, goals</TableCell>
                          <TableCell>Bassline AI Engine</TableCell>
                          <TableCell>365 days</TableCell>
                          <TableCell>User consent</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Music Sync</TableCell>
                          <TableCell>Playlist data, BPM preferences</TableCell>
                          <TableCell>Bassline Core Team</TableCell>
                          <TableCell>90 days</TableCell>
                          <TableCell>Legitimate interest</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Trainer Network</TableCell>
                          <TableCell>Session logs, feedback</TableCell>
                          <TableCell>Verified Trainers</TableCell>
                          <TableCell>180 days</TableCell>
                          <TableCell>User consent</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Analytics</TableCell>
                          <TableCell>Usage patterns, performance</TableCell>
                          <TableCell>Bassline Analytics</TableCell>
                          <TableCell>90 days</TableCell>
                          <TableCell>Legitimate interest</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                    
                    <div className="mt-4 p-3 bg-burgundy-light rounded border border-primary/20">
                      <p className="text-sm text-primary">
                        🔒 <strong>Protection Measures:</strong> End-to-end encryption, user access controls, 
                        regular security audits, and GDPR-compliant data handling procedures.
                      </p>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          {/* DSAR Report */}
          <Card className="shadow-card border-0">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Generate DSAR</h3>
                  <p className="text-sm text-muted-foreground">
                    Data Subject Access Request - see all your data
                  </p>
                </div>
              </div>
              <Collapsible open={showDSARReport} onOpenChange={setShowDSARReport}>
                <CollapsibleTrigger asChild>
                  <Button className="w-full mt-4 bg-primary hover:bg-burgundy-dark">
                    <span>Request My Data</span>
                    <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${showDSARReport ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <div className="bg-muted/30 rounded-lg p-4 space-y-4">
                    <h4 className="font-semibold text-primary mb-3">Your Personal Data Summary</h4>
                    
                    <div className="grid gap-4">
                      <div className="bg-background p-4 rounded border">
                        <h5 className="font-semibold mb-2">Account Details</h5>
                        <div className="space-y-1 text-sm">
                          <p><strong>Name:</strong> Sarah Johnson</p>
                          <p><strong>Email:</strong> sarah.johnson@email.com</p>
                          <p><strong>Date Joined:</strong> March 15, 2024</p>
                          <p><strong>Account Type:</strong> Premium Member</p>
                        </div>
                      </div>
                      
                      <div className="bg-background p-4 rounded border">
                        <h5 className="font-semibold mb-2">Fitness Profile</h5>
                        <div className="space-y-1 text-sm">
                          <p><strong>Preferred Formats:</strong> HIIT, Spinning, Pilates</p>
                          <p><strong>Fitness Goals:</strong> Weight loss, Endurance</p>
                          <p><strong>Activity Level:</strong> 4-5 times per week</p>
                          <p><strong>Last Workout:</strong> July 6, 2024</p>
                        </div>
                      </div>
                      
                      <div className="bg-background p-4 rounded border">
                        <h5 className="font-semibold mb-2">Music & Sync Data</h5>
                        <div className="space-y-1 text-sm">
                          <p><strong>Linked Playlists:</strong> 12 playlists</p>
                          <p><strong>Preferred BPM Range:</strong> 120-140 BPM</p>
                          <p><strong>Top Genre:</strong> Electronic/House</p>
                          <p><strong>Sync Sessions:</strong> 847 total sessions</p>
                        </div>
                      </div>
                      
                      <div className="bg-background p-4 rounded border">
                        <h5 className="font-semibold mb-2">Trainer Interactions</h5>
                        <div className="space-y-1 text-sm">
                          <p><strong>Active Trainers:</strong> 2 trainers</p>
                          <p><strong>Session Count:</strong> 23 sessions</p>
                          <p><strong>Last Session:</strong> June 28, 2024</p>
                          <p><strong>Feedback Rating:</strong> 4.8/5.0</p>
                        </div>
                      </div>
                    </div>
                    
                    <Button className="w-full mt-4 bg-secondary hover:bg-secondary/90">
                      <Download className="mr-2 h-4 w-4" />
                      Download Full Report (.zip)
                    </Button>
                    
                    <div className="mt-4 p-3 bg-burgundy-light rounded border border-primary/20">
                      <p className="text-sm text-primary">
                        📋 Your complete data report includes all workout logs, playlist sync history, 
                        trainer session notes, and account preferences. Report generated on July 7, 2025.
                      </p>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        </div>

        {/* Explanation */}
        <Card className="shadow-card border-0 bg-burgundy-light mb-20">
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="font-semibold text-primary mb-3">
                Transparency Made Simple
              </h3>
              <p className="text-sm text-primary/80 leading-relaxed">
                This screen lets both end users and auditors see data stored on the user (DSAR) 
                and how it's used by the app (ROPA). We believe in complete transparency about 
                your fitness and health data.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default PrivacyCompliance;