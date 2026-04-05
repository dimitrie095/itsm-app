import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { markdownToPdfFragments } from '@/lib/formatting'

// Register fonts if needed
// Font.register({ family: 'Roboto', src: '/fonts/Roboto-Regular.ttf' })

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: '#333333',
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 5,
  },
  meta: {
    fontSize: 10,
    color: '#666666',
    marginBottom: 3,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#444444',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#DDDDDD',
    paddingBottom: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 4,
    marginBottom: 15,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
  },
  aiSummaryText: {
    fontSize: 10,
    color: '#333333',
    lineHeight: 1.5,
    marginTop: 10,
  },
  boldText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  italicText: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  table: {
    display: 'flex',
    width: 'auto',
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#DDDDDD',
    alignItems: 'center',
    minHeight: 30,
  },
  tableHeader: {
    backgroundColor: '#F5F5F5',
    fontWeight: 'bold',
  },
  tableCell: {
    padding: 8,
    fontSize: 10,
    flex: 1,
  },
  tableCellId: {
    padding: 8,
    fontSize: 10,
    flex: 0.15,
  },
  tableCellTitle: {
    padding: 8,
    fontSize: 10,
    flex: 0.35,
  },
  tableCellPriority: {
    padding: 8,
    fontSize: 10,
    flex: 0.15,
  },
  tableCellStatus: {
    padding: 8,
    fontSize: 10,
    flex: 0.15,
  },
  tableCellCategory: {
    padding: 8,
    fontSize: 10,
    flex: 0.2,
  },
  tableCellCategoryCol: {
    padding: 8,
    fontSize: 10,
    flex: 0.7,
  },
  tableCellCount: {
    padding: 8,
    fontSize: 10,
    flex: 0.3,
  },
  footer: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#DDDDDD',
    fontSize: 10,
    color: '#666666',
  },
})

interface PDFReportProps {
  report: any
}

export function PDFReport({ report }: PDFReportProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{report.name}</Text>
          <Text style={styles.meta}>
            Generated on {new Date(report.createdAt).toLocaleDateString()} | 
            Type: {report.type} | Format: {report.format.toUpperCase()}
          </Text>
          <Text style={styles.meta}>
            Date Range: {new Date(report.metadata.dateRange.start).toLocaleDateString()} - 
            {new Date(report.metadata.dateRange.end).toLocaleDateString()}
          </Text>
        </View>

        {/* Executive Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Executive Summary</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{report.data?.totalTickets || 0}</Text>
              <Text style={styles.statLabel}>Total Tickets</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{report.data?.openTickets || 0}</Text>
              <Text style={styles.statLabel}>Open Tickets</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{report.data?.resolutionRate || 0}%</Text>
              <Text style={styles.statLabel}>Resolution Rate</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{report.data?.totalArticles || 0}</Text>
              <Text style={styles.statLabel}>Knowledge Articles</Text>
            </View>
          </View>
        </View>

        {/* AI Summary */}
        {report.summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI Summary</Text>
            <View style={{ marginTop: 10 }}>
              {markdownToPdfFragments(report.summary).map((fragment, idx) => (
                <Text
                  key={idx}
                  style={[
                    styles.aiSummaryText,
                    fragment.bold && styles.boldText,
                    fragment.italic && styles.italicText,
                  ]}
                >
                  {fragment.text}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* Top Categories */}
        {report.data?.topCategories && report.data.topCategories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Categories</Text>
            <View style={styles.table}>
              {/* Table Header */}
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={styles.tableCellCategoryCol}>Category</Text>
                <Text style={styles.tableCellCount}>Ticket Count</Text>
              </View>
              {/* Table Rows */}
              {report.data.topCategories.map((cat: any, index: number) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={styles.tableCellCategoryCol}>{cat.category || 'Unknown'}</Text>
                  <Text style={styles.tableCellCount}>{cat.count || 0}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recent Tickets */}
        {report.data?.recentTickets && report.data.recentTickets.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Tickets</Text>
            <View style={styles.table}>
              {/* Table Header */}
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={styles.tableCellId}>ID</Text>
                <Text style={styles.tableCellTitle}>Title</Text>
                <Text style={styles.tableCellPriority}>Priority</Text>
                <Text style={styles.tableCellStatus}>Status</Text>
                <Text style={styles.tableCellCategory}>Category</Text>
              </View>
              {/* Table Rows */}
              {report.data.recentTickets.slice(0, 10).map((ticket: any, index: number) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={styles.tableCellId}>{ticket.id.slice(-3) || 'N/A'}</Text>
                  <Text style={styles.tableCellTitle}>{ticket.title || 'No title'}</Text>
                  <Text style={styles.tableCellPriority}>{ticket.priority || 'N/A'}</Text>
                  <Text style={styles.tableCellStatus}>{ticket.status || 'N/A'}</Text>
                  <Text style={styles.tableCellCategory}>{ticket.category || 'N/A'}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Report generated by ITSM Portal</Text>
          <Text>{report.description}</Text>
        </View>
      </Page>
    </Document>
  )
}