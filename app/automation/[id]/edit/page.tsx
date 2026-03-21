"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Loader2, Sparkles, ArrowLeft, Save } from "lucide-react"
import { getAutomationRule, updateRule } from "../../actions"
import { useRouter, useParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronUp, ChevronDown } from "lucide-react"

// Extended trigger options for ITSM
const TRIGGER_OPTIONS = [
  // Ticket Triggers
  { value: "Ticket Created", label: "Ticket Created", description: "When a new ticket is created", category: "Ticket" },
  { value: "Ticket Updated", label: "Ticket Updated", description: "When any ticket field is updated", category: "Ticket" },
  { value: "Ticket Resolved", label: "Ticket Resolved", description: "When ticket status changes to Resolved", category: "Ticket" },
  { value: "Ticket Closed", label: "Ticket Closed", description: "When ticket status changes to Closed", category: "Ticket" },
  { value: "Ticket Assigned", label: "Ticket Assigned", description: "When ticket is assigned to an agent", category: "Ticket" },
  { value: "Ticket Reopened", label: "Ticket Reopened", description: "When a closed/resolved ticket is reopened", category: "Ticket" },
  { value: "Ticket Escalated", label: "Ticket Escalated", description: "When ticket escalation level increases", category: "Ticket" },
  { value: "Priority Changed", label: "Priority Changed", description: "When ticket priority is updated", category: "Ticket" },
  { value: "Category Changed", label: "Category Changed", description: "When ticket category is changed", category: "Ticket" },
  { value: "Comment Added", label: "Comment Added", description: "When a comment is added to a ticket", category: "Ticket" },
  
  // Asset Triggers
  { value: "Asset Created", label: "Asset Created", description: "When a new asset is added to inventory", category: "Asset" },
  { value: "Asset Updated", label: "Asset Updated", description: "When any asset field is updated", category: "Asset" },
  { value: "Asset Assigned", label: "Asset Assigned", description: "When asset is assigned to a user", category: "Asset" },
  { value: "Asset Returned", label: "Asset Returned", description: "When asset is returned from assignment", category: "Asset" },
  { value: "Asset Maintenance Due", label: "Asset Maintenance Due", description: "When asset maintenance is due", category: "Asset" },
  { value: "Asset Warranty Expiring", label: "Asset Warranty Expiring", description: "When asset warranty is about to expire", category: "Asset" },
  { value: "Asset Checked Out", label: "Asset Checked Out", description: "When asset is checked out", category: "Asset" },
  { value: "Asset Checked In", label: "Asset Checked In", description: "When asset is checked in", category: "Asset" },
  { value: "Asset Deprecated", label: "Asset Deprecated", description: "When asset is marked as deprecated", category: "Asset" },
  { value: "Asset Location Changed", label: "Asset Location Changed", description: "When asset location is updated", category: "Asset" },
  
  // User Triggers
  { value: "User Created", label: "User Created", description: "When a new user account is created", category: "User" },
  { value: "User Updated", label: "User Updated", description: "When user profile is updated", category: "User" },
  { value: "User Role Changed", label: "User Role Changed", description: "When user role is changed", category: "User" },
  { value: "User Department Changed", label: "User Department Changed", description: "When user department is updated", category: "User" },
  { value: "User Status Changed", label: "User Status Changed", description: "When user status changes (active/inactive)", category: "User" },
  { value: "User Permission Changed", label: "User Permission Changed", description: "When user permissions are modified", category: "User" },
  { value: "User Login", label: "User Login", description: "When user logs into the system", category: "User" },
  { value: "User Manager Changed", label: "User Manager Changed", description: "When user's manager is updated", category: "User" },
  
  // Knowledge Base Triggers
  { value: "Article Created", label: "Article Created", description: "When a new knowledge article is created", category: "Knowledge Base" },
  { value: "Article Updated", label: "Article Updated", description: "When knowledge article is updated", category: "Knowledge Base" },
  { value: "Article Published", label: "Article Published", description: "When article is published", category: "Knowledge Base" },
  { value: "Article Archived", label: "Article Archived", description: "When article is archived", category: "Knowledge Base" },
  { value: "Article Viewed", label: "Article Viewed", description: "When article is viewed by users", category: "Knowledge Base" },
  { value: "Article Rated", label: "Article Rated", description: "When article receives a rating", category: "Knowledge Base" },
  { value: "Comment Added to Article", label: "Comment Added to Article", description: "When comment is added to article", category: "Knowledge Base" },
  { value: "Article Category Changed", label: "Article Category Changed", description: "When article category is changed", category: "Knowledge Base" },
  
  // Reporting Triggers
  { value: "Report Generated", label: "Report Generated", description: "When report is generated", category: "Reporting" },
  { value: "Report Scheduled", label: "Report Scheduled", description: "When report is scheduled for generation", category: "Reporting" },
  { value: "Report Failed", label: "Report Failed", description: "When report generation fails", category: "Reporting" },
  { value: "Data Export Completed", label: "Data Export Completed", description: "When data export is completed", category: "Reporting" },
  { value: "Analytics Threshold Reached", label: "Analytics Threshold Reached", description: "When analytics threshold is reached", category: "Reporting" },
  
  // Role & Permission Triggers
  { value: "Role Created", label: "Role Created", description: "When a new role is created", category: "Role & Permission" },
  { value: "Role Updated", label: "Role Updated", description: "When role details are updated", category: "Role & Permission" },
  { value: "Role Deleted", label: "Role Deleted", description: "When a role is deleted", category: "Role & Permission" },
  { value: "Permission Added", label: "Permission Added", description: "When permission is added to role", category: "Role & Permission" },
  { value: "Permission Removed", label: "Permission Removed", description: "When permission is removed from role", category: "Role & Permission" },
  { value: "User Added to Role", label: "User Added to Role", description: "When user is assigned to a role", category: "Role & Permission" },
  { value: "User Removed from Role", label: "User Removed from Role", description: "When user is removed from a role", category: "Role & Permission" },
  
  // SLA Triggers
  { value: "SLA Breach", label: "SLA Breach", description: "When SLA response or resolution time is breached", category: "SLA" },
  { value: "SLA Warning", label: "SLA Warning", description: "When SLA is approaching breach threshold", category: "SLA" },
  { value: "SLA Updated", label: "SLA Updated", description: "When SLA policy is updated", category: "SLA" },
  { value: "SLA Created", label: "SLA Created", description: "When new SLA policy is created", category: "SLA" },
  { value: "SLA Deleted", label: "SLA Deleted", description: "When SLA policy is deleted", category: "SLA" },
  
  // Notification Triggers
  { value: "Notification Sent", label: "Notification Sent", description: "When notification is sent", category: "Notification" },
  { value: "Notification Read", label: "Notification Read", description: "When notification is read by recipient", category: "Notification" },
  { value: "Notification Failed", label: "Notification Failed", description: "When notification delivery fails", category: "Notification" },
  { value: "Notification Acknowledged", label: "Notification Acknowledged", description: "When notification is acknowledged", category: "Notification" },
  
  // Schedule Triggers
  { value: "Daily", label: "Daily", description: "Runs once per day at scheduled time", category: "Schedule" },
  { value: "Weekly", label: "Weekly", description: "Runs once per week at scheduled time", category: "Schedule" },
  { value: "Monthly", label: "Monthly", description: "Runs once per month at scheduled time", category: "Schedule" },
  { value: "Hourly", label: "Hourly", description: "Runs once per hour", category: "Schedule" },
  { value: "Quarterly", label: "Quarterly", description: "Runs once per quarter", category: "Schedule" },
  { value: "Yearly", label: "Yearly", description: "Runs once per year", category: "Schedule" },
  { value: "Specific Time", label: "Specific Time", description: "Runs at specific date and time", category: "Schedule" },
  
  // Communication Triggers
  { value: "Email Received", label: "Email Received", description: "When an email is received for a ticket", category: "Communication" },
  { value: "Chat Message", label: "Chat Message", description: "When a chat message is received", category: "Communication" },
  { value: "Email Sent", label: "Email Sent", description: "When email is sent from system", category: "Communication" },
  { value: "SMS Sent", label: "SMS Sent", description: "When SMS is sent from system", category: "Communication" },
  { value: "Chat Started", label: "Chat Started", description: "When chat session starts", category: "Communication" },
  { value: "Chat Ended", label: "Chat Ended", description: "When chat session ends", category: "Communication" },
  { value: "Call Logged", label: "Call Logged", description: "When phone call is logged", category: "Communication" },
  
  // General Triggers
  { value: "System Startup", label: "System Startup", description: "When system starts up", category: "General" },
  { value: "System Shutdown", label: "System Shutdown", description: "When system shuts down", category: "General" },
  { value: "Database Backup", label: "Database Backup", description: "When database backup completes", category: "General" },
  { value: "Error Logged", label: "Error Logged", description: "When error is logged in system", category: "General" },
  { value: "Audit Event", label: "Audit Event", description: "When audit event occurs", category: "General" },
]

// Action options with parameters
const ACTION_OPTIONS = [
  // Ticket Actions
  { value: "Assign to Team", label: "Assign to Team", description: "Assign ticket to a specific team", hasParam: true, paramLabel: "Team Name", category: "Ticket" },
  { value: "Assign to Agent", label: "Assign to Agent", description: "Assign ticket to a specific agent", hasParam: true, paramLabel: "Agent Name or Email", category: "Ticket" },
  { value: "Change Priority", label: "Change Priority", description: "Change ticket priority level", hasParam: true, paramLabel: "Priority (Low/Medium/High/Critical)", category: "Ticket" },
  { value: "Change Status", label: "Change Status", description: "Update ticket status", hasParam: true, paramLabel: "Status (New/Assigned/In Progress/Resolved/Closed)", category: "Ticket" },
  { value: "Add Tag", label: "Add Tag", description: "Add a tag to the ticket", hasParam: true, paramLabel: "Tag Name", category: "Ticket" },
  { value: "Remove Tag", label: "Remove Tag", description: "Remove a tag from the ticket", hasParam: true, paramLabel: "Tag Name", category: "Ticket" },
  { value: "Escalate Level", label: "Escalate Level", description: "Escalate ticket to next level", hasParam: false, category: "Ticket" },
  { value: "Close Ticket", label: "Close Ticket", description: "Close the ticket automatically", hasParam: false, category: "Ticket" },
  { value: "Add Comment", label: "Add Comment", description: "Add comment to ticket", hasParam: true, paramLabel: "Comment text", category: "Ticket" },
  { value: "Change Category", label: "Change Category", description: "Change ticket category", hasParam: true, paramLabel: "Category name", category: "Ticket" },
  { value: "Set Due Date", label: "Set Due Date", description: "Set or update ticket due date", hasParam: true, paramLabel: "Date (YYYY-MM-DD)", category: "Ticket" },
  
  // Asset Actions
  { value: "Assign Asset to User", label: "Assign Asset to User", description: "Assign asset to specific user", hasParam: true, paramLabel: "User email or ID", category: "Asset" },
  { value: "Update Asset Status", label: "Update Asset Status", description: "Update asset status", hasParam: true, paramLabel: "Status (Available/Assigned/Maintenance/Retired)", category: "Asset" },
  { value: "Schedule Maintenance", label: "Schedule Maintenance", description: "Schedule asset maintenance", hasParam: true, paramLabel: "Maintenance date", category: "Asset" },
  { value: "Update Asset Location", label: "Update Asset Location", description: "Update asset location", hasParam: true, paramLabel: "Location name", category: "Asset" },
  { value: "Mark Asset as Deprecated", label: "Mark Asset as Deprecated", description: "Mark asset as deprecated", hasParam: false, category: "Asset" },
  { value: "Send Asset Warranty Alert", label: "Send Asset Warranty Alert", description: "Send warranty expiration alert", hasParam: true, paramLabel: "Days before expiration", category: "Asset" },
  { value: "Create Purchase Request", label: "Create Purchase Request", description: "Create asset purchase request", hasParam: true, paramLabel: "Request details", category: "Asset" },
  { value: "Generate Asset Report", label: "Generate Asset Report", description: "Generate asset inventory report", hasParam: false, category: "Asset" },
  
  // User Actions
  { value: "Assign User Role", label: "Assign User Role", description: "Assign role to user", hasParam: true, paramLabel: "Role name", category: "User" },
  { value: "Update User Department", label: "Update User Department", description: "Update user department", hasParam: true, paramLabel: "Department name", category: "User" },
  { value: "Change User Status", label: "Change User Status", description: "Change user status", hasParam: true, paramLabel: "Status (Active/Inactive/Suspended)", category: "User" },
  { value: "Send Welcome Email", label: "Send Welcome Email", description: "Send welcome email to new user", hasParam: false, category: "User" },
  { value: "Reset Password", label: "Reset Password", description: "Reset user password", hasParam: false, category: "User" },
  { value: "Notify Manager", label: "Notify Manager", description: "Send notification to manager", hasParam: false, category: "User" },
  { value: "Update User Permissions", label: "Update User Permissions", description: "Update user permissions", hasParam: true, paramLabel: "Permission list", category: "User" },
  { value: "Add User to Group", label: "Add User to Group", description: "Add user to group", hasParam: true, paramLabel: "Group name", category: "User" },
  
  // Knowledge Base Actions
  { value: "Publish Article", label: "Publish Article", description: "Publish knowledge article", hasParam: false, category: "Knowledge Base" },
  { value: "Archive Article", label: "Archive Article", description: "Archive knowledge article", hasParam: false, category: "Knowledge Base" },
  { value: "Update Article Category", label: "Update Article Category", description: "Update article category", hasParam: true, paramLabel: "Category name", category: "Knowledge Base" },
  { value: "Notify Authors", label: "Notify Authors", description: "Notify article authors", hasParam: true, paramLabel: "Notification message", category: "Knowledge Base" },
  { value: "Send Article Review Request", label: "Send Article Review Request", description: "Send article review request", hasParam: true, paramLabel: "Reviewer email", category: "Knowledge Base" },
  { value: "Update Article Tags", label: "Update Article Tags", description: "Update article tags", hasParam: true, paramLabel: "Tags (comma separated)", category: "Knowledge Base" },
  { value: "Feature Article", label: "Feature Article", description: "Feature article on homepage", hasParam: false, category: "Knowledge Base" },
  { value: "Translate Article", label: "Translate Article", description: "Create translation of article", hasParam: true, paramLabel: "Target language", category: "Knowledge Base" },
  
  // Reporting Actions
  { value: "Generate Report", label: "Generate Report", description: "Generate report", hasParam: true, paramLabel: "Report type", category: "Reporting" },
  { value: "Schedule Report", label: "Schedule Report", description: "Schedule report generation", hasParam: true, paramLabel: "Schedule details", category: "Reporting" },
  { value: "Export Data", label: "Export Data", description: "Export data to file", hasParam: true, paramLabel: "Export format (CSV/Excel/PDF)", category: "Reporting" },
  { value: "Send Report via Email", label: "Send Report via Email", description: "Send report via email", hasParam: true, paramLabel: "Recipient email", category: "Reporting" },
  { value: "Archive Old Reports", label: "Archive Old Reports", description: "Archive old reports", hasParam: true, paramLabel: "Days threshold", category: "Reporting" },
  { value: "Notify on Report Failure", label: "Notify on Report Failure", description: "Notify on report generation failure", hasParam: true, paramLabel: "Admin email", category: "Reporting" },
  { value: "Update Dashboard", label: "Update Dashboard", description: "Update dashboard widgets", hasParam: false, category: "Reporting" },
  { value: "Create Data Snapshot", label: "Create Data Snapshot", description: "Create data snapshot", hasParam: false, category: "Reporting" },
  
  // Role & Permission Actions
  { value: "Create Role", label: "Create Role", description: "Create new role", hasParam: true, paramLabel: "Role name", category: "Role & Permission" },
  { value: "Update Role Permissions", label: "Update Role Permissions", description: "Update role permissions", hasParam: true, paramLabel: "Permission list", category: "Role & Permission" },
  { value: "Delete Role", label: "Delete Role", description: "Delete role", hasParam: true, paramLabel: "Role name", category: "Role & Permission" },
  { value: "Assign User to Role", label: "Assign User to Role", description: "Assign user to role", hasParam: true, paramLabel: "User email", category: "Role & Permission" },
  { value: "Remove User from Role", label: "Remove User from Role", description: "Remove user from role", hasParam: true, paramLabel: "User email", category: "Role & Permission" },
  { value: "Clone Role", label: "Clone Role", description: "Clone existing role", hasParam: true, paramLabel: "Source role name", category: "Role & Permission" },
  { value: "Audit Role Usage", label: "Audit Role Usage", description: "Audit role usage", hasParam: false, category: "Role & Permission" },
  { value: "Notify on Permission Change", label: "Notify on Permission Change", description: "Notify on permission change", hasParam: true, paramLabel: "Admin email", category: "Role & Permission" },
  
  // SLA Actions
  { value: "Update SLA Targets", label: "Update SLA Targets", description: "Update SLA targets", hasParam: true, paramLabel: "SLA policy name", category: "SLA" },
  { value: "Notify on SLA Breach", label: "Notify on SLA Breach", description: "Notify on SLA breach", hasParam: true, paramLabel: "Stakeholder emails", category: "SLA" },
  { value: "Escalate SLA Violation", label: "Escalate SLA Violation", description: "Escalate SLA violation", hasParam: false, category: "SLA" },
  { value: "Create SLA Report", label: "Create SLA Report", description: "Create SLA compliance report", hasParam: false, category: "SLA" },
  { value: "Adjust SLA Timers", label: "Adjust SLA Timers", description: "Adjust SLA timers", hasParam: true, paramLabel: "Timer adjustment (hours)", category: "SLA" },
  { value: "Notify Stakeholders", label: "Notify Stakeholders", description: "Notify stakeholders", hasParam: true, paramLabel: "Stakeholder list", category: "SLA" },
  { value: "Pause SLA Timer", label: "Pause SLA Timer", description: "Pause SLA timer", hasParam: true, paramLabel: "Ticket ID", category: "SLA" },
  { value: "Resume SLA Timer", label: "Resume SLA Timer", description: "Resume SLA timer", hasParam: true, paramLabel: "Ticket ID", category: "SLA" },
  
  // Notification Actions
  { value: "Send Email", label: "Send Email", description: "Send email notification", hasParam: true, paramLabel: "Email address or 'Requester'/'Assignee'", category: "Notification" },
  { value: "Send SMS", label: "Send SMS", description: "Send SMS notification", hasParam: true, paramLabel: "Phone number", category: "Notification" },
  { value: "Send Push Notification", label: "Send Push Notification", description: "Send push notification", hasParam: true, paramLabel: "Device tokens or user IDs", category: "Notification" },
  { value: "Create Notification Template", label: "Create Notification Template", description: "Create notification template", hasParam: true, paramLabel: "Template name", category: "Notification" },
  { value: "Schedule Notification", label: "Schedule Notification", description: "Schedule notification", hasParam: true, paramLabel: "Schedule time", category: "Notification" },
  { value: "Retry Failed Notification", label: "Retry Failed Notification", description: "Retry failed notification", hasParam: true, paramLabel: "Notification ID", category: "Notification" },
  { value: "Acknowledge Notification", label: "Acknowledge Notification", description: "Acknowledge notification", hasParam: true, paramLabel: "Notification ID", category: "Notification" },
  { value: "Log Notification", label: "Log Notification", description: "Log notification event", hasParam: true, paramLabel: "Log details", category: "Notification" },
  
  // Schedule Actions
  { value: "Run Script", label: "Run Script", description: "Run script or command", hasParam: true, paramLabel: "Script path or command", category: "Schedule" },
  { value: "Execute Command", label: "Execute Command", description: "Execute system command", hasParam: true, paramLabel: "Command to execute", category: "Schedule" },
  { value: "Call API", label: "Call API", description: "Call API endpoint", hasParam: true, paramLabel: "API URL", category: "Schedule" },
  { value: "Send HTTP Request", label: "Send HTTP Request", description: "Send HTTP request", hasParam: true, paramLabel: "Request URL", category: "Schedule" },
  { value: "Run Database Query", label: "Run Database Query", description: "Run database query", hasParam: true, paramLabel: "SQL query", category: "Schedule" },
  { value: "Generate File", label: "Generate File", description: "Generate file", hasParam: true, paramLabel: "File path and content", category: "Schedule" },
  { value: "Cleanup Old Data", label: "Cleanup Old Data", description: "Cleanup old data", hasParam: true, paramLabel: "Days threshold", category: "Schedule" },
  { value: "Backup Database", label: "Backup Database", description: "Backup database", hasParam: false, category: "Schedule" },
  
  // General Actions
  { value: "Log Event", label: "Log Event", description: "Log system event", hasParam: true, paramLabel: "Event details", category: "General" },
  { value: "Send Alert", label: "Send Alert", description: "Send system alert", hasParam: true, paramLabel: "Alert message", category: "General" },
  { value: "Create Audit Entry", label: "Create Audit Entry", description: "Create audit log entry", hasParam: true, paramLabel: "Audit details", category: "General" },
  { value: "Run System Command", label: "Run System Command", description: "Run system command", hasParam: true, paramLabel: "Command", category: "General" },
  { value: "Update Configuration", label: "Update Configuration", description: "Update system configuration", hasParam: true, paramLabel: "Config key-value", category: "General" },
  { value: "Restart Service", label: "Restart Service", description: "Restart system service", hasParam: true, paramLabel: "Service name", category: "General" },
  { value: "Clear Cache", label: "Clear Cache", description: "Clear system cache", hasParam: false, category: "General" },
  { value: "Validate Data", label: "Validate Data", description: "Validate system data", hasParam: true, paramLabel: "Validation rules", category: "General" },
  
  // Cross-category Actions
  { value: "Create Task", label: "Create Task", description: "Create a follow-up task", hasParam: true, paramLabel: "Task description", category: "General" },
  { value: "Update SLA", label: "Update SLA", description: "Update SLA timers or targets", hasParam: true, paramLabel: "SLA Policy Name", category: "SLA" },
]

// Condition options
const CONDITION_OPTIONS_WITH_CATEGORY = [
  { value: "Category = 'Hardware'", category: "Ticket" },
  { value: "Category = 'Software'", category: "Ticket" },
  { value: "Category = 'Network'", category: "Ticket" },
  { value: "Priority = 'High'", category: "Ticket" },
  { value: "Priority = 'Critical'", category: "Ticket" },
  { value: "Status = 'New'", category: "Ticket" },
  { value: "Status = 'Resolved'", category: "Ticket" },
  { value: "Assigned To = 'Support Team'", category: "Ticket" },
  { value: "Assigned To = 'Hardware Team'", category: "Ticket" },
  { value: "Age > 24 hours", category: "Ticket" },
  { value: "Age > 72 hours", category: "Ticket" },
  { value: "Requester = 'VIP'", category: "Ticket" },
  { value: "Requester Department = 'Finance'", category: "Ticket" },
  { value: "Impact = 'High'", category: "Ticket" },
  { value: "Urgency = 'High'", category: "Ticket" },
  { value: "Source = 'Email'", category: "Ticket" },
  { value: "Source = 'Phone'", category: "Ticket" },
  { value: "Asset Type = 'Laptop'", category: "Asset" },
  { value: "Asset Type = 'Desktop'", category: "Asset" },
  { value: "Asset Status = 'Assigned'", category: "Asset" },
  { value: "Asset Status = 'Available'", category: "Asset" },
  { value: "Asset Warranty < 30 days", category: "Asset" },
  { value: "Asset Location = 'Headquarters'", category: "Asset" },
  { value: "Asset Age > 3 years", category: "Asset" },
  { value: "Asset Maintenance Due = true", category: "Asset" },
  { value: "Asset Value > 1000", category: "Asset" },
  { value: "Asset Department = 'IT'", category: "Asset" },
  { value: "User Role = 'Admin'", category: "User" },
  { value: "User Role = 'Agent'", category: "User" },
  { value: "User Department = 'Support'", category: "User" },
  { value: "User Department = 'Development'", category: "User" },
  { value: "User Status = 'Active'", category: "User" },
  { value: "User Status = 'Inactive'", category: "User" },
  { value: "User Tenure > 1 year", category: "User" },
  { value: "User Permission contains 'tickets.assign'", category: "User" },
  { value: "User Manager = 'John Doe'", category: "User" },
  { value: "User Location = 'Remote'", category: "User" },
  { value: "Article Category = 'How-to'", category: "Knowledge Base" },
  { value: "Article Category = 'Troubleshooting'", category: "Knowledge Base" },
  { value: "Article Status = 'Draft'", category: "Knowledge Base" },
  { value: "Article Status = 'Published'", category: "Knowledge Base" },
  { value: "Article Views > 100", category: "Knowledge Base" },
  { value: "Article Rating >= 4", category: "Knowledge Base" },
  { value: "Article Age < 30 days", category: "Knowledge Base" },
  { value: "Article Author = 'Expert'", category: "Knowledge Base" },
  { value: "Article Tags contains 'important'", category: "Knowledge Base" },
  { value: "Article Language = 'English'", category: "Knowledge Base" },
  { value: "Report Type = 'Weekly'", category: "Reporting" },
  { value: "Report Status = 'Failed'", category: "Reporting" },
  { value: "Report Size > 10MB", category: "Reporting" },
  { value: "Export Format = 'PDF'", category: "Reporting" },
  { value: "Data Age > 90 days", category: "Reporting" },
  { value: "Threshold Reached = true", category: "Reporting" },
  { value: "Schedule = 'Daily'", category: "Reporting" },
  { value: "Recipient Count > 5", category: "Reporting" },
  { value: "Role Name contains 'Manager'", category: "Role & Permission" },
  { value: "Permission Count > 10", category: "Role & Permission" },
  { value: "User Count in Role > 5", category: "Role & Permission" },
  { value: "Role Created Date > 30 days ago", category: "Role & Permission" },
  { value: "Permission = 'tickets.delete'", category: "Role & Permission" },
  { value: "Role Status = 'Active'", category: "Role & Permission" },
  { value: "Role Type = 'Custom'", category: "Role & Permission" },
  { value: "SLA Breach Imminent", category: "SLA" },
  { value: "SLA Status = 'Breached'", category: "SLA" },
  { value: "SLA Type = 'Response'", category: "SLA" },
  { value: "SLA Type = 'Resolution'", category: "SLA" },
  { value: "Time Remaining < 2 hours", category: "SLA" },
  { value: "Priority = 'High' AND SLA Warning", category: "SLA" },
  { value: "Business Hours = true", category: "SLA" },
  { value: "Holiday = false", category: "SLA" },
  { value: "Notification Type = 'Email'", category: "Notification" },
  { value: "Notification Status = 'Failed'", category: "Notification" },
  { value: "Recipient = 'Manager'", category: "Notification" },
  { value: "Urgency = 'High'", category: "Notification" },
  { value: "Channel = 'SMS'", category: "Notification" },
  { value: "Read Status = false", category: "Notification" },
  { value: "Delivery Attempts > 3", category: "Notification" },
  { value: "Day of Week = 'Monday'", category: "Schedule" },
  { value: "Day of Week = 'Friday'", category: "Schedule" },
  { value: "Time of Day = '09:00'", category: "Schedule" },
  { value: "Month End = true", category: "Schedule" },
  { value: "Quarter End = true", category: "Schedule" },
  { value: "Year End = true", category: "Schedule" },
  { value: "Business Day = true", category: "Schedule" },
  { value: "Weekend or Holiday", category: "General" },
  { value: "System Load > 80%", category: "General" },
  { value: "Disk Space < 10%", category: "General" },
  { value: "Memory Usage > 90%", category: "General" },
  { value: "Database Size > 10GB", category: "General" },
  { value: "Error Count > 10", category: "General" },
  { value: "Audit Event = 'Security'", category: "General" },
  { value: "Backup Required = true", category: "General" },
]

// Flat array for backward compatibility
const CONDITION_OPTIONS = CONDITION_OPTIONS_WITH_CATEGORY.map(c => c.value)

// Status options for Change Status action
const STATUS_OPTIONS = [
  { value: "New", label: "New" },
  { value: "Assigned", label: "Assigned" },
  { value: "In Progress", label: "In Progress" },
  { value: "Resolved", label: "Resolved" },
  { value: "Closed", label: "Closed" },
]

// Priority options for Change Priority action
const PRIORITY_OPTIONS = [
  { value: "Low", label: "Low" },
  { value: "Medium", label: "Medium" },
  { value: "High", label: "High" },
  { value: "Critical", label: "Critical" },
]

// Email recipient options for Send Email action
const EMAIL_RECIPIENT_OPTIONS = [
  { value: "Requester", label: "Requester" },
  { value: "Assignee", label: "Assignee" },
  { value: "Manager", label: "Manager" },
]

// Team options (static for now, could be fetched from API later)
const TEAM_OPTIONS = [
  { value: "Support Team", label: "Support Team" },
  { value: "Hardware Team", label: "Hardware Team" },
  { value: "Software Team", label: "Software Team" },
  { value: "Network Team", label: "Network Team" },
  { value: "IT Team", label: "IT Team" },
]

// Tag options (static for now, could be fetched from API later)
const TAG_OPTIONS = [
  { value: "Critical", label: "Critical" },
  { value: "High Priority", label: "High Priority" },
  { value: "VIP", label: "VIP" },
  { value: "Hardware", label: "Hardware" },
  { value: "Software", label: "Software" },
  { value: "Bug", label: "Bug" },
  { value: "Feature Request", label: "Feature Request" },
]

// Asset status options for Update Asset Status action
const ASSET_STATUS_OPTIONS = [
  { value: "Available", label: "Available" },
  { value: "Assigned", label: "Assigned" },
  { value: "Maintenance", label: "Maintenance" },
  { value: "Retired", label: "Retired" },
  { value: "Lost", label: "Lost" },
  { value: "Damaged", label: "Damaged" },
]

// User status options for Change User Status action
const USER_STATUS_OPTIONS = [
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
  { value: "Suspended", label: "Suspended" },
  { value: "Terminated", label: "Terminated" },
]

// Export format options for Export Data action
const EXPORT_FORMAT_OPTIONS = [
  { value: "CSV", label: "CSV" },
  { value: "Excel", label: "Excel" },
  { value: "PDF", label: "PDF" },
  { value: "JSON", label: "JSON" },
]

// Article category options for Update Article Category action
const ARTICLE_CATEGORY_OPTIONS = [
  { value: "How-to", label: "How-to" },
  { value: "Troubleshooting", label: "Troubleshooting" },
  { value: "Reference", label: "Reference" },
  { value: "Announcement", label: "Announcement" },
  { value: "FAQ", label: "FAQ" },
  { value: "Best Practice", label: "Best Practice" },
]

// Role options for Assign User Role action
const ROLE_OPTIONS = [
  { value: "Admin", label: "Admin" },
  { value: "Agent", label: "Agent" },
  { value: "Manager", label: "Manager" },
  { value: "Viewer", label: "Viewer" },
  { value: "Support", label: "Support" },
  { value: "Developer", label: "Developer" },
]

// Category options for the rule itself (not just trigger categories)
const CATEGORY_OPTIONS = [
  { value: "Ticket", label: "Ticket Automations" },
  { value: "Asset", label: "Asset Automations" },
  { value: "User", label: "User Automations" },
  { value: "Knowledge Base", label: "Knowledge Base" },
  { value: "Reporting", label: "Reporting & Analytics" },
  { value: "Role & Permission", label: "Role & Permission" },
  { value: "SLA", label: "SLA Automations" },
  { value: "Notification", label: "Notification" },
  { value: "Schedule", label: "Scheduled" },
  { value: "General", label: "General" },
]

interface FormData {
  name: string
  description: string
  category: string
  trigger: string
  condition: string
  action: string
  actionParam: string
  isActive: boolean
}

interface AutomationRule {
  id: string
  name: string
  description: string
  category: string
  trigger: string
  condition: string
  action: string
  status: boolean
}

interface Agent {
  id: string
  email: string
  name: string | null
  role: string
  department: string | null
}

export default function EditRulePage() {
  const router = useRouter()
  const params = useParams()
  const ruleId = params.id as string
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [useConditionPreset, setUseConditionPreset] = useState(true)
  const [agents, setAgents] = useState<Agent[]>([])
  const [loadingAgents, setLoadingAgents] = useState(false)
  const [triggerOpen, setTriggerOpen] = useState(true)
  const [conditionOpen, setConditionOpen] = useState(true)
  const [actionOpen, setActionOpen] = useState(true)
  
  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    category: "",
    trigger: "",
    condition: "",
    action: "",
    actionParam: "",
    isActive: true,
  })

  useEffect(() => {
    async function loadRule() {
      if (!ruleId) return
      
      setIsLoading(true)
      try {
        const rule = await getAutomationRule(ruleId)
        
        if (!rule) {
          toast.error("Rule not found")
          router.push('/automation')
          return
        }

        // Parse action and actionParam from the stored action string
        let action = rule.action
        let actionParam = ""
        
        // Check if action contains a parameter (format: "Action: Parameter")
        const colonIndex = rule.action.indexOf(':')
        if (colonIndex > -1) {
          action = rule.action.substring(0, colonIndex).trim()
          actionParam = rule.action.substring(colonIndex + 1).trim()
        }

        setFormData({
          name: rule.name,
          description: rule.description,
          category: rule.category || "General",
          trigger: rule.trigger,
          condition: rule.condition,
          action: action,
          actionParam: actionParam,
          isActive: rule.status,
        })
      } catch (error) {
        toast.error("Failed to load rule")
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadRule()
  }, [ruleId, router])

  // Fetch assignable agents
  useEffect(() => {
    async function fetchAgents() {
      setLoadingAgents(true)
      try {
        const response = await fetch('/api/assignable-users')
        if (response.ok) {
          const data = await response.json()
          setAgents(data)
        } else {
          toast.error('Failed to load agents')
        }
      } catch (error) {
        console.error('Error fetching agents:', error)
        toast.error('Failed to load agents')
      } finally {
        setLoadingAgents(false)
      }
    }

    fetchAgents()
  }, [])

  // Reset selections when category changes
  useEffect(() => {
    if (!formData.category) return

    // Check if selected trigger belongs to current category
    if (formData.trigger) {
      const trigger = TRIGGER_OPTIONS.find(t => t.value === formData.trigger)
      if (trigger && trigger.category !== formData.category) {
        setFormData(prev => ({ ...prev, trigger: '' }))
      }
    }

    // Check if selected condition belongs to current category
    if (formData.condition) {
      const condition = CONDITION_OPTIONS_WITH_CATEGORY.find(c => c.value === formData.condition)
      if (condition && condition.category !== formData.category) {
        setFormData(prev => ({ ...prev, condition: '' }))
      }
    }

    // Check if selected action belongs to current category
    if (formData.action) {
      const action = ACTION_OPTIONS.find(a => a.label === formData.action)
      if (action && action.category !== formData.category) {
        setFormData(prev => ({ ...prev, action: '', actionParam: '' }))
      }
    }
  }, [formData.category])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.category || !formData.trigger || !formData.action) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsSubmitting(true)

    try {
      const ruleData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        trigger: formData.trigger,
        condition: formData.condition,
        action: formData.action,
        actionParam: formData.actionParam || undefined,
        isActive: formData.isActive,
      }

      const result = await updateRule(ruleId, ruleData)

      if (result.success) {
        toast.success("Rule updated successfully")
        router.push('/automation')
        router.refresh()
      } else {
        toast.error(result.error || "Failed to update rule")
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedAction = ACTION_OPTIONS.find(a => a.label === formData.action)
  const selectedTrigger = TRIGGER_OPTIONS.find(t => t.value === formData.trigger)

  // Filter triggers by selected category
  const filteredTriggers = formData.category 
    ? TRIGGER_OPTIONS.filter(t => t.category === formData.category)
    : TRIGGER_OPTIONS;

  // Group triggers by category
  const triggerCategories = filteredTriggers.reduce((acc, trigger) => {
    if (!acc[trigger.category]) acc[trigger.category] = []
    acc[trigger.category].push(trigger)
    return acc
  }, {} as Record<string, typeof TRIGGER_OPTIONS>)

  // Filter actions by selected category
  const filteredActions = formData.category
    ? ACTION_OPTIONS.filter(a => a.category === formData.category)
    : ACTION_OPTIONS;

  // Filter conditions by selected category
  const filteredConditions = formData.category
    ? CONDITION_OPTIONS_WITH_CATEGORY.filter(c => c.category === formData.category)
    : CONDITION_OPTIONS_WITH_CATEGORY;

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-muted-foreground">Loading rule...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/automation">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-amber-500" />
              Edit Automation Rule
            </h1>
            <p className="text-muted-foreground">
              Update your automation rule configuration.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Provide basic details about your automation rule
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Rule Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g., Auto-assign Hardware Tickets"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what this automation rule does..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">
                    Category <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="triggers" className="space-y-4">
              <TabsList className="grid grid-cols-3">
                <TabsTrigger value="triggers">Triggers</TabsTrigger>
                <TabsTrigger value="conditions">Conditions</TabsTrigger>
                <TabsTrigger value="actions">Actions</TabsTrigger>
              </TabsList>

              <TabsContent value="triggers" className="space-y-3">
                <Collapsible open={triggerOpen} onOpenChange={setTriggerOpen}>
                  <div className="flex items-center justify-between">
                    <Label>When this happens (Trigger) <span className="text-red-500">*</span></Label>
                    <CollapsibleTrigger asChild>
                      <button type="button" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {triggerOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>

                        <div className="grid grid-cols-1 gap-3">
                          {Object.entries(triggerCategories).map(([category, triggers]) => (
                            <div key={category} className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{category}</p>
                              <div className="grid grid-cols-2 gap-3">
                                {triggers.map((trigger) => (
                                  <button
                                    key={trigger.value}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, trigger: trigger.value })}
                                    className={`text-left p-3 rounded-lg border transition-all ${
                                      formData.trigger === trigger.value
                                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                                    }`}
                                  >
                                    <p className="font-medium text-sm">{trigger.label}</p>
                                    <p className="text-xs text-muted-foreground">{trigger.description}</p>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                        {selectedTrigger && (
                          <div className="flex items-center gap-2 p-3 bg-muted rounded">
                            <span className="text-sm">Selected trigger:</span>
                            <Badge variant="secondary">{selectedTrigger.label}</Badge>
                          </div>
                        )}
                  </CollapsibleContent>
                </Collapsible>
              </TabsContent>

              <TabsContent value="conditions" className="space-y-3">
                <Collapsible open={conditionOpen} onOpenChange={setConditionOpen}>
                  <div className="flex items-center justify-between">
                    <Label>If these conditions are met</Label>
                    <CollapsibleTrigger asChild>
                      <button type="button" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {conditionOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                        <div className="flex items-center justify-end">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={useConditionPreset}
                              onCheckedChange={setUseConditionPreset}
                              id="condition-preset"
                            />
                            <Label htmlFor="condition-preset" className="text-sm">
                              Use preset conditions
                            </Label>
                          </div>
                        </div>
        
                        {useConditionPreset ? (
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-2">
                               {filteredConditions.map((condition) => (
                                 <button
                                   key={condition.value}
                                   type="button"
                                   onClick={() => setFormData({ ...formData, condition: condition.value })}
                                   className={`text-xs px-2 py-1 rounded-full border ${
                                     formData.condition === condition.value ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                                   }`}
                                 >
                                   {condition.value}
                                 </button>
                               ))}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Input
                              placeholder="e.g., Category = 'Hardware' AND Priority = 'High'"
                              value={formData.condition}
                              onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground">
                              Use simple expressions like: Category = &apos;Hardware&apos;, Priority = &apos;High&apos;, Age &gt; 24
                            </p>
                          </div>
                        )}
        
                        {formData.condition && (
                          <div className="flex items-center gap-2 p-3 bg-muted rounded">
                            <span className="text-sm">Current condition:</span>
                            <code className="text-sm bg-background px-2 py-0.5 rounded">{formData.condition}</code>
                          </div>
                        )}
                  </CollapsibleContent>
                </Collapsible>
              </TabsContent>

              <TabsContent value="actions" className="space-y-3">
                <Collapsible open={actionOpen} onOpenChange={setActionOpen}>
                  <div className="flex items-center justify-between">
                    <Label>Then do this (Action) <span className="text-red-500">*</span></Label>
                    <CollapsibleTrigger asChild>
                      <button type="button" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {actionOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>

                        <div className="grid grid-cols-2 gap-3">
                          {filteredActions.map((action) => (
                            <button
                              key={action.value}
                              type="button"
                              onClick={() => setFormData({ ...formData, action: action.label, actionParam: "" })}
                              className={`text-left p-3 rounded-lg border transition-all ${
                                formData.action === action.label
                                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                                  : "border-border hover:border-primary/50 hover:bg-muted/50"
                              }`}
                            >
                              <p className="font-medium text-sm">{action.label}</p>
                              <p className="text-xs text-muted-foreground">{action.description}</p>
                            </button>
                          ))}
                        </div>
        
                        {selectedAction?.hasParam && (
                          <div className="space-y-2 pt-4">
                            <Label htmlFor="actionParam">
                              {selectedAction.paramLabel ?? 'Parameter'} <span className="text-red-500">*</span>
                            </Label>
                            
                            {/* Assign to Agent - dynamic from API */}
                            {selectedAction.label === "Assign to Agent" && (
                              loadingAgents ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Loading agents...
                                </div>
                              ) : (
                                <Select
                                  value={formData.actionParam}
                                  onValueChange={(value) => setFormData({ ...formData, actionParam: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select an agent" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {agents.map((agent) => (
                                      <SelectItem key={agent.id} value={agent.email}>
                                        {agent.name} ({agent.email}) {agent.department ? `- ${agent.department}` : ''}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )
                            )}
        
                            {/* Change Status - static options */}
                            {selectedAction.label === "Change Status" && (
                              <Select
                                value={formData.actionParam}
                                onValueChange={(value) => setFormData({ ...formData, actionParam: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                  {STATUS_OPTIONS.map((status) => (
                                    <SelectItem key={status.value} value={status.value}>
                                      {status.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
        
                            {/* Change Priority - static options */}
                            {selectedAction.label === "Change Priority" && (
                              <Select
                                value={formData.actionParam}
                                onValueChange={(value) => setFormData({ ...formData, actionParam: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                                <SelectContent>
                                  {PRIORITY_OPTIONS.map((priority) => (
                                    <SelectItem key={priority.value} value={priority.value}>
                                      {priority.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
        
                            {/* Assign to Team - static options */}
                            {selectedAction.label === "Assign to Team" && (
                              <Select
                                value={formData.actionParam}
                                onValueChange={(value) => setFormData({ ...formData, actionParam: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select team" />
                                </SelectTrigger>
                                <SelectContent>
                                  {TEAM_OPTIONS.map((team) => (
                                    <SelectItem key={team.value} value={team.value}>
                                      {team.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
        
                            {/* Add Tag / Remove Tag - static options */}
                            {(selectedAction.label === "Add Tag" || selectedAction.label === "Remove Tag") && (
                              <Select
                                value={formData.actionParam}
                                onValueChange={(value) => setFormData({ ...formData, actionParam: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select tag" />
                                </SelectTrigger>
                                <SelectContent>
                                  {TAG_OPTIONS.map((tag) => (
                                    <SelectItem key={tag.value} value={tag.value}>
                                      {tag.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
        
                            {/* Send Email - predefined recipients */}
                            {selectedAction.label === "Send Email" && (
                              <Select
                                value={formData.actionParam}
                                onValueChange={(value) => setFormData({ ...formData, actionParam: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select recipient" />
                                </SelectTrigger>
                                <SelectContent>
                                  {EMAIL_RECIPIENT_OPTIONS.map((recipient) => (
                                    <SelectItem key={recipient.value} value={recipient.value}>
                                      {recipient.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
        
                            {/* Update Asset Status - asset status options */}
                            {selectedAction.label === "Update Asset Status" && (
                              <Select
                                value={formData.actionParam}
                                onValueChange={(value) => setFormData({ ...formData, actionParam: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select asset status" />
                                </SelectTrigger>
                                <SelectContent>
                                  {ASSET_STATUS_OPTIONS.map((status) => (
                                    <SelectItem key={status.value} value={status.value}>
                                      {status.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
        
                            {/* Change User Status - user status options */}
                            {selectedAction.label === "Change User Status" && (
                              <Select
                                value={formData.actionParam}
                                onValueChange={(value) => setFormData({ ...formData, actionParam: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select user status" />
                                </SelectTrigger>
                                <SelectContent>
                                  {USER_STATUS_OPTIONS.map((status) => (
                                    <SelectItem key={status.value} value={status.value}>
                                      {status.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
        
                            {/* Export Data - export format options */}
                            {selectedAction.label === "Export Data" && (
                              <Select
                                value={formData.actionParam}
                                onValueChange={(value) => setFormData({ ...formData, actionParam: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select export format" />
                                </SelectTrigger>
                                <SelectContent>
                                  {EXPORT_FORMAT_OPTIONS.map((format) => (
                                    <SelectItem key={format.value} value={format.value}>
                                      {format.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
        
                            {/* Update Article Category - article category options */}
                            {selectedAction.label === "Update Article Category" && (
                              <Select
                                value={formData.actionParam}
                                onValueChange={(value) => setFormData({ ...formData, actionParam: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select article category" />
                                </SelectTrigger>
                                <SelectContent>
                                  {ARTICLE_CATEGORY_OPTIONS.map((category) => (
                                    <SelectItem key={category.value} value={category.value}>
                                      {category.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
        
                            {/* Assign User Role - role options */}
                            {selectedAction.label === "Assign User Role" && (
                              <Select
                                value={formData.actionParam}
                                onValueChange={(value) => setFormData({ ...formData, actionParam: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                  {ROLE_OPTIONS.map((role) => (
                                    <SelectItem key={role.value} value={role.value}>
                                      {role.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
        
                            {/* Default input for other actions */}
                            {!["Assign to Agent", "Change Status", "Change Priority", "Assign to Team", "Add Tag", "Remove Tag", "Send Email", "Update Asset Status", "Change User Status", "Export Data", "Update Article Category", "Assign User Role"].includes(selectedAction.label) && (
                              <Input
                                id="actionParam"
                                placeholder={`Enter ${selectedAction.paramLabel?.toLowerCase() ?? 'parameter'}...`}
                                value={formData.actionParam}
                                onChange={(e) => setFormData({ ...formData, actionParam: e.target.value })}
                                required
                              />
                            )}
                          </div>
                        )}
                  </CollapsibleContent>
                </Collapsible>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Status & Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="isActive" className="cursor-pointer">Active Rule</Label>
                    <p className="text-xs text-muted-foreground">
                      Enable or disable this automation rule
                    </p>
                  </div>
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Update Rule
                      </>
                    )}
                  </Button>
                  
                  <Button type="button" variant="outline" className="w-full" onClick={() => router.push('/automation')}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Rule Name</p>
                  <p className="font-medium">{formData.name || "Not set"}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="font-medium">
                    {formData.category ? CATEGORY_OPTIONS.find(c => c.value === formData.category)?.label : "Not set"}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Trigger</p>
                  <p className="font-medium">{selectedTrigger?.label || "Not set"}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Condition</p>
                  <p className="font-medium">{formData.condition || "No condition"}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Action</p>
                  <p className="font-medium">{selectedAction?.label || "Not set"}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="font-medium">
                    <Badge variant={formData.isActive ? "default" : "secondary"}>
                      {formData.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}