"use client"

import { useCallback, useState } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import CampaignNode from "@/components/campaign-node"
import { ABTestCreator } from "@/components/ab-test-creator"
import { ComparisonView } from "@/components/comparison-view"

const nodeTypes = {
  campaign: CampaignNode,
}

const initialNodes: Node[] = [
  {
    id: "1",
    type: "campaign",
    position: { x: 250, y: 100 },
    data: {
      variantName: "Summer Sale Campaign",
      variantType: "original",
      status: "active",
      goal: "leads",
      metrics: {
        impressions: 45230,
        clicks: 1820,
        ctr: 4.02,
        cpm: 12.5,
        amountSpent: 564.38,
        costPerResult: 8.75,
        results: 64,
      },
      adCopy: {
        headline: "Get 50% Off Summer Collection",
        description: "Limited time offer on all summer items. Shop now and save big!",
      },
      leadFormFields: [
        { name: "Name", value: "64 submissions" },
        { name: "Email", value: "64 submissions" },
        { name: "Phone", value: "58 submissions" },
      ],
      performance: "winning",
    },
  },
  {
    id: "2",
    type: "campaign",
    position: { x: 700, y: 100 },
    data: {
      variantName: "Variant A - Different Audience",
      variantType: "test",
      status: "active",
      testVariable: "audience",
      goal: "leads",
      metrics: {
        impressions: 38450,
        clicks: 1240,
        ctr: 3.23,
        cpm: 14.2,
        amountSpent: 546.19,
        costPerResult: 11.2,
        results: 49,
      },
      adCopy: {
        headline: "Get 50% Off Summer Collection",
        description: "Limited time offer on all summer items. Shop now and save big!",
      },
      leadFormFields: [
        { name: "Name", value: "49 submissions" },
        { name: "Email", value: "49 submissions" },
        { name: "Phone", value: "42 submissions" },
      ],
      performance: "losing",
    },
  },
]

const initialEdges: Edge[] = [
  {
    id: "e1-2",
    source: "1",
    target: "2",
    type: "smoothstep",
    animated: true,
    label: "A/B Test",
  },
]

export default function CampaignsPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false)
  const [isCreatingTest, setIsCreatingTest] = useState(false)
  const [selectedCampaignForTest, setSelectedCampaignForTest] = useState<any>(null)
  const [isComparing, setIsComparing] = useState(false)
  const [variantsToCompare, setVariantsToCompare] = useState<any>(null)

  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges])

  const handleCreateCampaign = () => {
    setIsCreatingCampaign(true)
  }

  const handleCreateTest = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId)
    if (node) {
      setSelectedCampaignForTest({
        name: node.data.variantName,
        targetLocation: "United States",
        audience: "Broad audience",
        adCopy: node.data.adCopy,
        creativeUrl: "/placeholder.svg",
      })
      setIsCreatingTest(true)
    }
  }

  const handleTestCreated = (testVariable: string, variantData: any) => {
    console.log("[v0] Creating test:", testVariable, variantData)
    setIsCreatingTest(false)
  }

  const handleCompare = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId)
    if (node) {
      // Find connected variant (if exists)
      const connectedEdge = edges.find((e) => e.source === nodeId || e.target === nodeId)
      if (connectedEdge) {
        const otherNodeId = connectedEdge.source === nodeId ? connectedEdge.target : connectedEdge.source
        const otherNode = nodes.find((n) => n.id === otherNodeId)
        if (otherNode) {
          setVariantsToCompare([
            { id: node.id, ...node.data },
            { id: otherNode.id, ...otherNode.data },
          ])
          setIsComparing(true)
        }
      }
    }
  }

  const nodesWithHandlers = nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      onCreateTest: () => handleCreateTest(node.id),
      onToggleStatus: () => console.log("[v0] Toggle status:", node.id),
      onCompare: () => handleCompare(node.id),
    },
  }))

  return (
    <div className="h-screen w-full flex flex-col">
      {/* Header */}
      <header className="border-b bg-background px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Campaign Canvas</h1>
          <p className="text-sm text-muted-foreground">Manage your ad campaigns visually</p>
        </div>
        <Button onClick={handleCreateCampaign} size="lg">
          <Plus className="mr-2 h-4 w-4" />
          Create Campaign
        </Button>
      </header>

      {/* Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodesWithHandlers}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          className="bg-muted/20"
        >
          <Background />
          <Controls />
          <MiniMap
            className="bg-background border"
            nodeColor={(node) => {
              const data = node.data as any
              if (data.performance === "winning") return "#22c55e"
              if (data.performance === "losing") return "#ef4444"
              return "#3b82f6"
            }}
          />
        </ReactFlow>

        {/* Empty state */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center space-y-4">
              <div className="text-6xl">🎯</div>
              <h2 className="text-2xl font-semibold">No campaigns yet</h2>
              <p className="text-muted-foreground max-w-md">
                Create your first campaign to start managing your Facebook ads visually with A/B testing capabilities
              </p>
            </div>
          </div>
        )}
      </div>

      {/* A/B test creator modal */}
      {selectedCampaignForTest && (
        <ABTestCreator
          open={isCreatingTest}
          onOpenChange={setIsCreatingTest}
          originalCampaign={selectedCampaignForTest}
          onCreateTest={handleTestCreated}
        />
      )}

      {variantsToCompare && (
        <ComparisonView open={isComparing} onOpenChange={setIsComparing} variants={variantsToCompare} />
      )}
    </div>
  )
}
