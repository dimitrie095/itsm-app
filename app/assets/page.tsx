import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Plus, Search, Filter, Cpu, Monitor, Printer, Server } from "lucide-react"

export default function AssetsPage() {
  const assets = [
    { id: "AST-001", name: "Dell Latitude 5420", type: "Laptop", status: "Active", assignedTo: "John Doe", location: "Floor 3", warranty: "2026-05-15" },
    { id: "AST-002", name: "HP EliteDisplay", type: "Monitor", status: "Active", assignedTo: "Jane Smith", location: "Floor 2", warranty: "2025-12-10" },
    { id: "AST-003", name: "Cisco Router", type: "Network", status: "Maintenance", assignedTo: "IT Dept", location: "Server Room", warranty: "2027-03-20" },
    { id: "AST-004", name: "Microsoft Office", type: "Software", status: "Active", assignedTo: "Robert Brown", location: "License", warranty: "2025-10-01" },
    { id: "AST-005", name: "Canon ImageRunner", type: "Printer", status: "Retired", assignedTo: "N/A", location: "Storage", warranty: "Expired" },
    { id: "AST-006", name: "Lenovo ThinkStation", type: "Desktop", status: "Active", assignedTo: "Alice Johnson", location: "Floor 4", warranty: "2026-08-30" },
  ]

  const typeIcon = (type: string) => {
    switch (type) {
      case "Laptop": return <Cpu className="h-4 w-4" />
      case "Monitor": return <Monitor className="h-4 w-4" />
      case "Printer": return <Printer className="h-4 w-4" />
      case "Server": return <Server className="h-4 w-4" />
      default: return <Cpu className="h-4 w-4" />
    }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case "Active": return "bg-green-100 text-green-800"
      case "Maintenance": return "bg-yellow-100 text-yellow-800"
      case "Retired": return "bg-gray-100 text-gray-800"
      case "Lost": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assets</h1>
          <p className="text-muted-foreground">Manage IT assets, inventory, and warranties.</p>
        </div>
        <Button asChild>
          <a href="/assets/new">
            <Plus className="mr-2 h-4 w-4" />
            New Asset
          </a>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">289</div>
            <p className="text-xs text-muted-foreground">+12 from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">245</div>
            <p className="text-xs text-muted-foreground">85% of total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Under Warranty</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">187</div>
            <p className="text-xs text-muted-foreground">Expiring soon: 23</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18</div>
            <p className="text-xs text-muted-foreground">3 critical</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Asset Inventory</CardTitle>
              <CardDescription>All hardware and software assets.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search assets..." className="w-[300px] pl-9" />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Warranty</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell className="font-medium">{asset.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {typeIcon(asset.type)}
                      {asset.name}
                    </div>
                  </TableCell>
                  <TableCell>{asset.type}</TableCell>
                  <TableCell>
                    <Badge className={statusColor(asset.status)}>{asset.status}</Badge>
                  </TableCell>
                  <TableCell>{asset.assignedTo}</TableCell>
                  <TableCell>{asset.location}</TableCell>
                  <TableCell>
                    <Badge variant={asset.warranty === "Expired" ? "destructive" : "outline"}>
                      {asset.warranty}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Assign to User</DropdownMenuItem>
                        <DropdownMenuItem>Update Status</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">Retire Asset</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}