import React from "react";
import { Modal, View, Text, TouchableOpacity } from "react-native";
import { MatchFormat } from "../src/models/types";

interface MatchConfigModalProps {
  visible: boolean;
  onConfirm: (matchFormat: MatchFormat, periodDuration: number) => void;
  onRequestClose: () => void;
}

export default function MatchConfigModal({
  visible,
  onConfirm,
  onRequestClose,
}: MatchConfigModalProps) {
  const [matchFormat, setMatchFormat] = React.useState<MatchFormat>("2_halves");
  const [periodDuration, setPeriodDuration] = React.useState<number>(1200);

  // Update period duration when format changes
  React.useEffect(() => {
    setPeriodDuration(matchFormat === "2_halves" ? 1200 : 600);
  }, [matchFormat]);

  const formatDurationDisplay = (seconds: number): string => {
    return `${Math.floor(seconds / 60)} min`;
  };

  const getTotalMatchDuration = (): string => {
    const periods = matchFormat === "2_halves" ? 2 : 4;
    const totalSeconds = periods * periodDuration;
    return formatDurationDisplay(totalSeconds);
  };

  const handleConfirm = () => {
    onConfirm(matchFormat, periodDuration);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <View
          style={{
            backgroundColor: "white",
            borderRadius: 16,
            padding: 24,
            minWidth: 300,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              marginBottom: 24,
              textAlign: "center",
            }}
          >
            Configuration du match
          </Text>

          {/* Match format configuration */}
          <View style={{ width: 250 }}>
            <Text style={{ fontSize: 16, fontWeight: "bold", marginBottom: 12, textAlign: "center" }}>
              Format du match
            </Text>
            
            <View style={{ flexDirection: "row", marginBottom: 16 }}>
              {[
                { key: "2_halves", label: "2 mi-temps", icon: "⏱️" },
                { key: "4_quarters", label: "4 quart-temps", icon: "🏀" },
              ].map((format) => (
                <TouchableOpacity
                  key={format.key}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    marginHorizontal: 4,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                    backgroundColor: matchFormat === format.key ? "#e3f2fd" : "#f5f5f5",
                    borderWidth: 1,
                    borderColor: matchFormat === format.key ? "#1976d2" : "#ddd",
                  }}
                  onPress={() => setMatchFormat(format.key as MatchFormat)}
                >
                  <Text style={{ fontSize: 16, marginRight: 4 }}>{format.icon}</Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: matchFormat === format.key ? "#1976d2" : "#333",
                      fontWeight: matchFormat === format.key ? "bold" : "normal",
                      textAlign: "center",
                    }}
                  >
                    {format.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 8, textAlign: "center" }}>
              Durée par période
            </Text>
            
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                <TouchableOpacity
                  style={{
                    backgroundColor: "#f0f0f0",
                    borderRadius: 20,
                    width: 32,
                    height: 32,
                    alignItems: "center",
                    justifyContent: "center",
                    marginHorizontal: 8,
                  }}
                  onPress={() => setPeriodDuration(Math.max(60, periodDuration - 60))}
                >
                  <Text style={{ fontSize: 18, fontWeight: "bold", color: "#666" }}>-</Text>
                </TouchableOpacity>
                
                <Text style={{ fontSize: 18, fontWeight: "bold", minWidth: 60, textAlign: "center" }}>
                  {formatDurationDisplay(periodDuration)}
                </Text>
                
                <TouchableOpacity
                  style={{
                    backgroundColor: "#f0f0f0",
                    borderRadius: 20,
                    width: 32,
                    height: 32,
                    alignItems: "center",
                    justifyContent: "center",
                    marginHorizontal: 8,
                  }}
                  onPress={() => setPeriodDuration(Math.min(3600, periodDuration + 60))}
                >
                  <Text style={{ fontSize: 18, fontWeight: "bold", color: "#666" }}>+</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={{ fontSize: 12, color: "#888", textAlign: "center" }}>
                Durée totale : {getTotalMatchDuration()}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity
              style={{
                backgroundColor: "#f5f5f5",
                borderRadius: 8,
                paddingVertical: 10,
                paddingHorizontal: 24,
                borderWidth: 1,
                borderColor: "#ddd",
              }}
              onPress={onRequestClose}
            >
              <Text style={{ color: "#666", fontWeight: "bold", fontSize: 16 }}>
                Retour
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: "#007AFF",
                borderRadius: 8,
                paddingVertical: 10,
                paddingHorizontal: 24,
              }}
              onPress={handleConfirm}
            >
              <Text style={{ color: "white", fontWeight: "bold", fontSize: 16 }}>
                Commencer
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}