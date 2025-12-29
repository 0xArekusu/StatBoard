import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Image } from "react-native";
import JerseyIcon from "./icons/JerseyIcon";
import { Team } from "../src/models/types";

interface Player {
  id: number;
  num: number;
  name: string;
  photoUrl?: string;
  isSubstitute: boolean;
}

interface Coach {
  id: number;
  name: string;
  photoUrl?: string;
  isCoach: boolean;
}

interface SubstitutesManagerProps {
  substitutes: Player[];
  coach: Coach;
  onSubstituteEdit: (id: number) => void;
  onCoachEdit: (id: number) => void;
  onAddSubstitute: () => void;
  onRemoveSubstitute: () => void;
  currentTeam: Team;
  teamLetter: Team; // L'équipe réelle de ces remplaçants
  maxSubstitutes: number; // 10 maximum
  isPortrait: boolean;
  jerseyPrimaryColor?: string;
  jerseySecondaryColor?: string;
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
  maxSubstitutes = 10,
  isPortrait,
  jerseyPrimaryColor = "#FF0000",
  jerseySecondaryColor = "#000000",
}: SubstitutesManagerProps) {
  const canAddSubstitute = substitutes.length < maxSubstitutes;
  const canRemoveSubstitute = substitutes.length > 0;

  // Calculer la position selon l'orientation
  const isTeamOnTop = teamLetter === currentTeam;

  // En portrait : position verticale (haut/bas), à gauche
  // En paysage : position horizontale (gauche/droite), en bas
  const getPosition = () => {
    if (isPortrait) {
      // Portrait : position à gauche, verticalement selon l'équipe
      return {
        left: 10,
        top: isTeamOnTop ? 90 : 660,
        width: 100,
        height: 400,
      };
    } else {
      // Paysage : position en bas, horizontalement selon l'équipe
      return {
        left: isTeamOnTop ? 40 : 700,
        top: 5,
        width: 400,
        height: 100,
      };
    }
  };

  const position = getPosition();

  const renderButtons = () => (
    <View
      style={{
        flexDirection: isPortrait ? "row" : "column",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: isPortrait ? 8 : 0,
        marginRight: isPortrait ? 0 : 8,
        gap: 8,
      }}
    >
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
      horizontal={!isPortrait}
      showsVerticalScrollIndicator={isPortrait}
      showsHorizontalScrollIndicator={!isPortrait}
      contentContainerStyle={{
        gap: 8,
        flexDirection: isPortrait ? "column" : "row",
      }}
    >
      {substitutes.map((substitute, index) => (
        <View key={substitute.id} style={{ alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => onSubstituteEdit(substitute.id)}
            style={{
              width: 50,
              height: 50,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <JerseyIcon
              width={50}
              primaryColor={jerseyPrimaryColor}
              secondaryColor={jerseySecondaryColor}
              number={substitute.num}
            />
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
          overflow: "hidden",
        }}
      >
        {coach.photoUrl ? (
          <Image
            source={{ uri: coach.photoUrl }}
            style={{
              width: "100%",
              height: "100%",
            }}
          />
        ) : (
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
        )}
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
        ...position,
        backgroundColor: "rgba(0,0,0,0.1)",
        borderRadius: 12,
        padding: 8,
        flexDirection: isPortrait ? "column" : "row",
      }}
    >
      {isPortrait ? (
        // Mode Portrait : Structure verticale
        <>
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
        </>
      ) : (
        // Mode Paysage : Structure horizontale
        <>
          {/* Structure pour équipe à gauche : Boutons → Indicateur → Liste → Coach */}
          {isTeamOnTop && (
            <>
              {renderButtons()}
              {renderIndicator({ marginRight: 8, alignSelf: "center" })}
              {renderSubstitutesList()}
              {renderCoach({ marginLeft: 8 })}
            </>
          )}

          {/* Structure pour équipe à droite : Coach → Liste → Indicateur → Boutons */}
          {!isTeamOnTop && (
            <>
              {renderCoach({ marginRight: 8 })}
              {renderSubstitutesList()}
              {renderIndicator({
                marginLeft: 8,
                marginRight: 8,
                alignSelf: "center",
              })}
              {renderButtons()}
            </>
          )}
        </>
      )}
    </View>
  );
}
