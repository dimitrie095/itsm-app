import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer'

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

        {/* Top Categories */}
        {report.data?.topCategories && report.data.topCategories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Categories</Text>
            <View style={styles.table}>
              {/* Table Header */}
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={styles.tableCell}>Category</Text>
                <Text style={styles.tableCell}>Ticket Count</Text>
              </View>
              {/* Table Rows */}
              {report.data.topCategories.map((cat: any, index: number) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{cat.category || 'Unknown'}</Text>
                  <Text style={styles.tableCell}>{cat.count || 0}</Text>
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
                <Text style={styles.tableCell}>ID</Text>
                <Text style={styles.tableCell}>Title</Text>
                <Text style={styles.tableCell}>Priority</Text>
                <Text style={styles.tableCell}>Status</Text>
                <Text style={styles.tableCell}>Category</Text>
              </View>
              {/* Table Rows */}
              {report.data.recentTickets.slice(0, 10).map((ticket: any, index: number) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{ticket.id || 'N/A'}</Text>
                  <Text style={styles.tableCell}>{ticket.title || 'No title'}</Text>
                  <Text style={styles.tableCell}>{ticket.priority || 'N/A'}</Text>
                  <Text style={styles.tableCell}>{ticket.status || 'N/A'}</Text>
                  <Text style={styles.tableCell}>{ticket.category || 'N/A'}</Text>
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