import * as React from "react";

import "./header.scss";

import { connect } from "react-redux";
import { push } from "react-router-redux";

import { Button, ButtonGroup, DropdownButton, MenuItem, Dropdown } from "react-bootstrap";
import { Spinner } from "../../../components/ui/spinner";
import { ToggleButton } from "../../../components/ui/toggleButton";
import { Game, Player, PlayState } from "../../../external/imperaClients";
import { autobind } from "../../../lib/autobind";
import { css } from "../../../lib/css";
import { IState } from "../../../reducers";
import { attack, endAttack, endTurn, exchange, leave, move, place, toggleSidebar, setGameOption } from "../play.actions";
import { canMoveOrAttack, canPlace, game, inputActive } from "../reducer/play.selectors";
import { IGameUIOptions } from "../reducer/play.reducer.state";
import Cards from "./cards";
import { Timer } from "../../../components/ui/timer";
import { getTeam } from "../../../lib/game/utils";

interface IHeaderProps {
}

interface IHeaderDispatchProps {
    game: Game;
    remainingPlaceUnits: number;
    player: Player;

    inputActive: boolean;
    operationInProgress: boolean;
    gameUiOptions: IGameUIOptions;
    canPlace: boolean;
    canMoveOrAttack: boolean;

    place: () => void;
    exchangeCards: () => void;
    attack: () => void;
    endAttack: () => void;
    move: () => void;
    endTurn: () => void;

    toggleSidebar: () => void;
    setGameUiOption: (name: keyof IGameUIOptions, value: boolean) => void;
    exit: () => void;
}

class Header extends React.Component<IHeaderProps & IHeaderDispatchProps> {
    render() {
        const {
            game, remainingPlaceUnits, player, inputActive, canPlace, canMoveOrAttack, operationInProgress, gameUiOptions
        } = this.props;

        if (!game) {
            return null;
        }

        const isTeamGame = game.options.numberOfPlayersPerTeam > 1;
        const team = getTeam(game, game.currentPlayer.userId);

        const currentPlayer = <span className={css(
            "label",
            "current-player",
            "player",
            "player-" + (game.currentPlayer.playOrder + 1),
            {
                ["player-team-" + (team && team.playOrder + 1)]: isTeamGame
            })}>
            {game.currentPlayer.name}
        </span>;

        return <div className="play-header">
            <div className="play-header-block">
                <ToggleButton className="btn-u" onToggle={this._onToggleSidebar} initialIsToggled={false}>
                    <span className="fa fa-bars" />
                </ToggleButton>
            </div>

            <div className="play-header-block stacked visible-xs text-center">
                {currentPlayer}
                <Timer key={`${game.id}-${game.turnCounter}`} startInMs={game.timeoutSecondsLeft * 1000} />
            </div>

            <div className="play-header-block full-text hidden-xs">
                {currentPlayer}
            </div>
            <div className="play-header-block full-text hidden-xs">
                <Timer key={`${game.id}-${game.turnCounter}`} startInMs={game.timeoutSecondsLeft * 1000} />
            </div>

            {/* Cards  */}
            <div className="play-header-block hidden-xs">
                <Button
                    className="btn btn-u"
                    title={`${__("Exchange cards")} (${player && player.cards && player.cards.length || 0}/${game.options.maximumNumberOfCards})`}
                    onClick={this._onExchangeCards}
                    disabled={!inputActive || game.playState !== PlayState.PlaceUnits}>
                    <Cards cards={player && player.cards} />
                </Button>
            </div>

            {/* Actions */}
            {inputActive && <div className="play-header-block">
                {
                    game.playState === PlayState.PlaceUnits &&
                    <Button
                        title={__("Place")}
                        className={css("btn-u", {
                            "current": game.playState === PlayState.PlaceUnits,
                            "enabled": canPlace,
                            "hidden-xs": game.playState !== PlayState.PlaceUnits
                        })}
                        onClick={this._onPlace}
                        disabled={!canPlace}>
                        <span className="fa fa-dot-circle-o"></span>&nbsp;<span>{remainingPlaceUnits}/{game.unitsToPlace}</span>
                    </Button>
                }

                {
                    game.playState === PlayState.Attack &&
                    <ButtonGroup>
                        <Button key="attack" title={__("Attack")} className={css("btn-u", {
                            "current": game.playState === PlayState.Attack,
                            "enabled": true
                        })}
                            disabled={!canMoveOrAttack}
                            onClick={this._onAttack}>
                            <span className="fa fa-crosshairs" />&nbsp;<span>
                                {game.attacksInCurrentTurn}/{game.options.attacksPerTurn}
                            </span>
                        </Button>
                        <Button key="endattack" title={__("Change to move")} className="btn-u" onClick={this._onEndAttack}>
                            <span className="fa fa-mail-forward"></span>
                        </Button>
                    </ButtonGroup>
                }

                {
                    (game.playState === PlayState.Attack || game.playState === PlayState.Move) && <Button title={__("Move")} className={css("btn-u", {
                        "current": game.playState === PlayState.Move,
                        "enabled": canMoveOrAttack,
                        "hidden-xs": game.playState !== PlayState.Move
                    })
                    }
                        onClick={this._onMove}
                        disabled={!canMoveOrAttack}>
                        <span className="fa fa-mail-forward"></span>&nbsp;<span>
                            {game.movesInCurrentTurn}/{game.options.movesPerTurn}
                        </span>
                    </Button>
                }
            </div>}

            {/* End Turn */}
            {inputActive && game.playState !== PlayState.PlaceUnits && <div className="play-header-block">
                <Button bsStyle="danger" className={css("btn-u", {
                    "enabled": game.playState !== PlayState.PlaceUnits
                })} title={__("End turn")} onClick={this._onEndTurn}>
                    <span className="fa fa-check"></span>
                </Button>
            </div>}

            {/* Right section */}
            <div className="play-header-block right">
                {/* Options */}
                <Dropdown id="options" pullRight className="options">
                    <Dropdown.Toggle noCaret>
                        <span className="fa fa-cog" />
                    </Dropdown.Toggle>
                    <Dropdown.Menu className="super-colors">
                        <MenuItem eventKey="showTeamsOnMap" onSelect={this._toggleGameUiOption as any} active={gameUiOptions.showTeamsOnMap}>
                            {__("Show teams on map [CTRL]")}
                        </MenuItem>
                    </Dropdown.Menu>
                </Dropdown>

                <Button className="btn-u" onClick={this._onExit} title={__("Exit")}>
                    <span className="fa fa-level-up" />
                </Button>
            </div>

            {/* Spinner */}
            {
                operationInProgress && <div className="play-header-block right">
                    <Spinner />
                </div>
            }
        </div >;
    }

    @autobind
    private _toggleGameUiOption(eventKey: keyof IGameUIOptions): void {
        const { gameUiOptions } = this.props;

        this.props.setGameUiOption(eventKey, !gameUiOptions[eventKey])
    }

    @autobind
    private _onExchangeCards() {
        this.props.exchangeCards();
    }

    @autobind
    private _onPlace() {
        this.props.place();
    }

    @autobind
    private _onAttack() {
        this.props.attack();
    }

    @autobind
    private _onEndAttack() {
        this.props.endAttack();
    }

    @autobind
    private _onMove() {
        this.props.move();
    }

    @autobind
    private _onEndTurn() {
        this.props.endTurn();
    }

    @autobind
    private _onToggleSidebar() {
        this.props.toggleSidebar();
    }

    @autobind
    private _onExit() {
        this.props.exit();
    }
}

export default connect((state: IState, ownProps: IHeaderProps) => {
    const { placeCountries, player, operationInProgress, gameUiOptions } = state.play.data;
    const remainingPlaceUnits = Object.keys(placeCountries).reduce((sum, ci) => sum + placeCountries[ci], 0);

    return {
        game: game(state.play),
        remainingPlaceUnits,
        player,
        inputActive: inputActive(state.play),
        canPlace: canPlace(state.play),
        canMoveOrAttack: canMoveOrAttack(state.play),
        operationInProgress,
        gameUiOptions
    };
}, (dispatch) => ({
    place: () => { dispatch(place(null)) },
    exchangeCards: () => { dispatch(exchange(null)) },
    attack: () => { dispatch(attack(null)) },
    endAttack: () => { dispatch(endAttack(null)) },
    move: () => { dispatch(move(null)) },
    endTurn: () => { dispatch(endTurn(null)) },

    toggleSidebar: () => { dispatch(toggleSidebar(null)); },
    setGameUiOption: (name: keyof IGameUIOptions, value: boolean) => {
        dispatch(setGameOption({
            name,
            value,
            temporary: false
        }));
    },
    exit: () => { dispatch(leave()); }
}))(Header);