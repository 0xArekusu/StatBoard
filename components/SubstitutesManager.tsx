import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";

interface Player {
  id: number;
  num: number;
  name: string;
  isSubstitute: boolean;
}

interface Coach {
  id: number;
  name: string;
  isCoach: boolean;
}

interface SubstitutesManagerProps {
  substitutes: Player[];
  coach: Coach;
  onSubstituteEdit: (id: number) => void;
  onCoachEdit: (id: number) => void;
  onAddSubstitute: () => void;
  onRemoveSubstitute: () => void;
  currentTeam: "A" | "B";
  teamLetter: "A" | "B"; // L'équipe réelle de ces remplaçants
  maxSubstitutes: number; // 8 maximum
}

export default function SubstitutesManager({
  substitutes,
  coach,
  onSubstituteEdit,
  onCoachEdit,
  onAddSubstitute,
  onRemoveSubstitute,
  currentTeam,
  teamLetter,
  maxSubstitutes = 8,
}: SubstitutesManagerProps) {
  const canAddSubstitute = substitutes.length < maxSubstitutes;
  const canRemoveSubstitute = substitutes.length > 0;

  // Calculer la position : l'équipe du currentTeam est en haut, l'autre en bas
  const isTeamOnTop = teamLetter === currentTeam;
  const topPosition = isTeamOnTop ? 60 : 620;

  const renderButtons = () => (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 8,
        gap: 8,
      }}
    >
      <TouchableOpacity
        onPress={onRemoveSubstitute}
        disabled={!canRemoveSubstitute}
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: canRemoveSubstitute ? "#f44336" : "#666",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text
          style={{
            color: "#fff",
            fontSize: 18,
            fontWeight: "bold",
            lineHeight: 20,
          }}
        >
          -
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onAddSubstitute}
        disabled={!canAddSubstitute}
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: canAddSubstitute ? "#4caf50" : "#666",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text
          style={{
            color: "#fff",
            fontSize: 18,
            fontWeight: "bold",
            lineHeight: 20,
          }}
        >
          +
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderIndicator = (marginStyle: any) => (
    <Text
      style={{
        color: "#fff",
        fontSize: 10,
        textAlign: "center",
        opacity: 0.8,
        textShadowColor: "rgba(0,0,0,0.8)",
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
        ...marginStyle,
      }}
    >
      {substitutes.length}/{maxSubstitutes}
    </Text>
  );

  const renderSubstitutesList = () => (
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={true}
      contentContainerStyle={{ gap: 8 }}
    >
      {substitutes.map((substitute, index) => (
        <View key={substitute.id} style={{ alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => onSubstituteEdit(substitute.id)}
            style={{
              width: 40,
              height: 40,
              backgroundColor: "#1976d2",
              borderRadius: 20,
              justifyContent: "center",
              alignItems: "center",
              borderWidth: 2,
              borderColor: "#fff",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 5,
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontSize: 16,
                fontWeight: "bold",
                textShadowColor: "rgba(0,0,0,0.5)",
                textShadowOffset: { width: 1, height: 1 },
                textShadowRadius: 2,
              }}
            >
              {substitute.num}
            </Text>
          </TouchableOpacity>
          <Text
            style={{
              color: "#fff",
              fontSize: 10,
              fontWeight: "bold",
              textAlign: "center",
              width: 60,
              textShadowColor: "rgba(0,0,0,0.8)",
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 2,
              marginTop: 2,
            }}
          >
            {substitute.name}
          </Text>
        </View>
      ))}
    </ScrollView>
  );

  const renderCoach = (marginStyle: any) => (
    <View style={{ alignItems: "center", ...marginStyle }}>
      <TouchableOpacity
        onPress={() => onCoachEdit(coach.id)}
        style={{
          width: 40,
          height: 40,
          backgroundColor: "#FF6B35",
          borderRadius: 20,
          justifyContent: "center",
          alignItems: "center",
          borderWidth: 2,
          borderColor: "#fff",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: 5,
        }}
      >
        <Text
          style={{
            color: "#fff",
            fontSize: 16,
            fontWeight: "bold",
            textShadowColor: "rgba(0,0,0,0.5)",
            textShadowOffset: { width: 1, height: 1 },
            textShadowRadius: 2,
          }}
        >
          C
        </Text>
      </TouchableOpacity>
      <Text
        style={{
          color: "#fff",
          fontSize: 10,
          fontWeight: "bold",
          textAlign: "center",
          width: 60,
          textShadowColor: "rgba(0,0,0,0.8)",
          textShadowOffset: { width: 1, height: 1 },
          textShadowRadius: 2,
          marginTop: 2,
        }}
      >
        {coach.name}
      </Text>
    </View>
  );

  return (
    <View
      style={{
        position: "absolute",
        left: 10,
        top: topPosition,
        width: 100,
        height: 400,
        backgroundColor: "rgba(0,0,0,0.1)",
        borderRadius: 12,
        padding: 8,
      }}
    >
      {/* Structure pour équipe en haut : Boutons → Indicateur → Liste → Coach */}
      {isTeamOnTop && (
        <>
          {renderButtons()}
          {renderIndicator({ marginBottom: 8 })}
          {renderSubstitutesList()}
          {renderCoach({ marginTop: 8 })}
        </>
      )}

      {/* Structure pour équipe en bas : Coach → Liste → Indicateur → Boutons */}
      {!isTeamOnTop && (
        <>
          {renderCoach({ marginBottom: 8 })}
          {renderSubstitutesList()}
          {renderIndicator({ marginTop: 8, marginBottom: 8 })}
          {renderButtons()}
        </>
      )}
    </View>
  );
}
